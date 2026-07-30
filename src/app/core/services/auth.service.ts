import { Injectable, signal, inject } from '@angular/core';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  MultiFactorResolver,
  getMultiFactorResolver,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { UserProfile, AuthState } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);

  readonly authState = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isMfaPending: false,
    isLoading: true,
    error: null
  });

  private mfaResolver: MultiFactorResolver | null = null;

  constructor() {
    getRedirectResult(this.firebaseService.auth).then((result) => {
      if (result) {
        this.syncUserProfile(result.user);
      }
    });

    onAuthStateChanged(this.firebaseService.auth, async (firebaseUser) => {
      if (firebaseUser) {
        await this.syncUserProfile(firebaseUser);
      } else {
        this.authState.set({
          user: null,
          isAuthenticated: false,
          isMfaPending: false,
          isLoading: false,
          error: null
        });
      }
    });
  }

  async loginWithEmail(email: string, pass: string): Promise<void> {
    this.authState.update(s => ({ ...s, isLoading: true, error: null }));
    try {
      const cred = await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
      await this.syncUserProfile(cred.user);
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required') {
        this.mfaResolver = getMultiFactorResolver(this.firebaseService.auth, err);
        this.authState.update(s => ({ ...s, isMfaPending: true, isLoading: false }));
      } else {
        this.authState.update(s => ({ ...s, isLoading: false, error: err.message }));
        throw err;
      }
    }
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.firebaseService.auth, provider);
      await this.syncUserProfile(result.user);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        // Fallback to page redirect when popups are blocked by Firefox/Safari privacy settings
        await signInWithRedirect(this.firebaseService.auth, provider);
      } else {
        this.authState.update(s => ({ ...s, error: err.message }));
        throw err;
      }
    }
  }

  async setupTotpMfa(): Promise<{ secretCode: string; qrCodeUrl: string }> {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) throw new Error('User session missing');

    const multiFactorSession = await multiFactor(currentUser).getSession();
    const secret: TotpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
    
    const qrCodeUrl = secret.generateQrCodeUrl(
      currentUser.email || 'user@budgettracker.app',
      'Budget Tracker FinTech'
    );

    return { secretCode: secret.secretKey, qrCodeUrl };
  }

  async verifyAndEnrollTotp(secret: TotpSecret, verificationCode: string): Promise<void> {
    const currentUser = this.firebaseService.auth.currentUser;
    if (!currentUser) throw new Error('User session missing');

    const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode);
    await multiFactor(currentUser).enroll(assertion, 'Authenticator App');
    await this.syncUserProfile(currentUser);
  }

  async verifyMfaChallenge(verificationCode: string): Promise<void> {
    if (!this.mfaResolver) throw new Error('No MFA session found');

    const selectedHint = this.mfaResolver.hints[0];
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(selectedHint.uid, verificationCode);
    const cred = await this.mfaResolver.resolveSignIn(assertion);
    this.mfaResolver = null;
    await this.syncUserProfile(cred.user);
  }

  async logout(): Promise<void> {
    await firebaseSignOut(this.firebaseService.auth);
  }

  private async syncUserProfile(user: User): Promise<void> {
    const userRef = doc(this.firebaseService.db, 'users', user.uid);
    const snap = await getDoc(userRef);

    let profile: UserProfile;
    const enrolledMfa = multiFactor(user).enrolledFactors.length > 0;

    if (snap.exists()) {
      profile = snap.data() as UserProfile;
      profile.mfaEnabled = enrolledMfa;
      profile.lastLoginAt = Date.now();
      await setDoc(userRef, profile, { merge: true });
    } else {
      profile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Budget User',
        role: 'owner',
        mfaEnabled: enrolledMfa,
        lastLoginAt: Date.now()
      };
      await setDoc(userRef, profile);
    }

    this.authState.set({
      user: profile,
      isAuthenticated: true,
      isMfaPending: false,
      isLoading: false,
      error: null
    });
  }
}