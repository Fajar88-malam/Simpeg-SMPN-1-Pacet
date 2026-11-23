import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Activity,
  Award,
  Building2,
  Landmark,
  LogOut,
  Menu,
  Settings,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  DEFAULT_SCHOOL_PROFILE,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
  type EmployeePrivateContact,
  type SchoolProfile,
  type UserAccount,
} from './types/kepegawaian';
import { SEED_EMPLOYEES_SMPN1_PACET } from './data/seedEmployees';
import { EmployeeDirectoryView } from './components/EmployeeDirectoryView';
import { EmployeeModal } from './components/EmployeeModal';
import { DUKView } from './components/DUKView';
import { AttendanceDashboardView } from './components/AttendanceDashboardView';
import { PersonalProfileView } from './components/PersonalProfileView';
import { SchoolProfileView } from './components/SchoolProfileView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { AuthLoginPortal, normalizeIdentifierToEmail } from './components/AuthLoginPortal';

type NavTab = 'directory' | 'duk' | 'attendance' | 'personal' | 'school' | 'admin';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [pendingClaimNip, setPendingClaimNip] = useState<string | null>(null);
  const [initialTabResolved, setInitialTabResolved] = useState(false);

  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [myPrivateContact, setMyPrivateContact] = useState<EmployeePrivateContact | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL_PROFILE);

  const [activeTab, setActiveTab] = useState<NavTab>('directory');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [editingModalEmployee, setEditingModalEmployee] = useState<Employee | null | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [autoSeededOnce, setAutoSeededOnce] = useState(false);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const isBootstrapped =
      currentUser.emailVerified && currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL;
    return isBootstrapped || isAdminDoc;
  }, [currentUser, isAdminDoc]);

  const myEmployee = useMemo(() => {
    if (!currentUser) return null;
    if (userAccount?.employeeId) {
      const byLink = employees.find((e) => e.id === userAccount.employeeId);
      if (byLink && (isAdmin || byLink.ownerUid === currentUser.uid)) {
        return byLink;
      }
    }
    return employees.find((e) => e.ownerUid === currentUser.uid) || null;
  }, [currentUser, employees, userAccount, isAdmin]);

  const reportAsyncFirestoreError = useCallback(
    (err: unknown, op: OperationType, path: string | null) => {
      try {
        handleFirestoreError(err, op, path);
      } catch (wrapped) {
        setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
    []
  );

  // 1. Auth Listener & Redirect Result Handler
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        setAuthError(
          `Domain ${window.location.hostname} belum diizinkan pada Firebase Authentication (Authorized domains).`
        );
      } else if (!raw.includes('auth/no-current-user')) {
        setAuthError(raw);
      }
    });

    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        setEmployees([]);
        setAttendanceRecords([]);
        setIsAdminDoc(false);
        setUserAccount(null);
        setMyPrivateContact(null);
        setSchoolProfile(DEFAULT_SCHOOL_PROFILE);
        setEmployeesLoading(false);
        setInitialTabResolved(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Ensure UserAccount doc & check Admin doc
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const adminRef = doc(db, 'admins', currentUser.uid);
    const unsubAdmin = onSnapshot(
      adminRef,
      (snap) => {
        setIsAdminDoc(snap.exists());
      },
      (error) => {
        reportAsyncFirestoreError(error, OperationType.GET, `admins/${currentUser.uid}`);
      }
    );

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(
      userRef,
      async (snap) => {
        if (snap.exists()) {
          setUserAccount(snap.data() as UserAccount);
        } else {
          try {
            const safeEmail = (currentUser.email || 'user@smpn1pacet.sch.id').trim().slice(0, 200);
            const safeDisplayName =
              (currentUser.displayName || 'Pegawai SMPN 1 Pacet').trim().slice(0, 120) ||
              'Pegawai SMPN 1 Pacet';
            const payload = {
              uid: currentUser.uid,
              email: safeEmail.length >= 3 ? safeEmail : 'user@smpn1pacet.sch.id',
              displayName: safeDisplayName,
              employeeId: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, payload);
          } catch (err) {
            reportAsyncFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
          }
        }
      },
      (error) => {
        reportAsyncFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
      }
    );

    return () => {
      unsubAdmin();
      unsubUser();
    };
  }, [authReady, currentUser, reportAsyncFirestoreError]);

  // 3. Employees Real-Time Listener
  useEffect(() => {
    if (!authReady || !currentUser) return;

    setEmployeesLoading(true);
    const q = query(collection(db, 'employees'), where('schoolCode', '==', 'SMPN1PACET'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Employee);
        list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
        setEmployees(list);
        setEmployeesLoading(false);
      },
      (error) => {
        setEmployeesLoading(false);
        reportAsyncFirestoreError(error, OperationType.LIST, 'employees');
      }
    );

    return () => unsub();
  }, [authReady, currentUser, reportAsyncFirestoreError]);

  // 4. Attendance Real-Time Listener
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const q = query(
      collection(db, 'attendance'),
      where('schoolCode', '==', 'SMPN1PACET'),
      where('date', '==', selectedDate)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const logs = snap.docs.map((d) => d.data() as AttendanceRecord);
        setAttendanceRecords(logs);
      },
      (error) => {
        reportAsyncFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    return () => unsub();
  }, [authReady, currentUser, selectedDate, reportAsyncFirestoreError]);

  // 5. Private Contact Listener for linked Employee
  useEffect(() => {
    if (!authReady || !currentUser || !myEmployee) {
      setMyPrivateContact(null);
      return;
    }

    const contactRef = doc(db, 'employees', myEmployee.id, 'private', 'contact');
    const unsub = onSnapshot(
      contactRef,
      (snap) => {
        if (snap.exists()) {
          setMyPrivateContact(snap.data() as EmployeePrivateContact);
        } else {
          setMyPrivateContact(null);
        }
      },
      (error) => {
        reportAsyncFirestoreError(
          error,
          OperationType.GET,
          `employees/${myEmployee.id}/private/contact`
        );
      }
    );

    return () => unsub();
  }, [authReady, currentUser, myEmployee, reportAsyncFirestoreError]);

  // 5b. School Profile Real-Time Listener
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const schoolRef = doc(db, 'school_profile', 'smpn1pacet');
    const unsub = onSnapshot(
      schoolRef,
      (snap) => {
        if (snap.exists()) {
          setSchoolProfile({
            ...DEFAULT_SCHOOL_PROFILE,
            ...(snap.data() as Partial<SchoolProfile>),
          });
        } else {
          setSchoolProfile(DEFAULT_SCHOOL_PROFILE);
        }
      },
      (error) => {
        reportAsyncFirestoreError(error, OperationType.GET, 'school_profile/smpn1pacet');
      }
    );

    return () => unsub();
  }, [authReady, currentUser, reportAsyncFirestoreError]);

  // 6. Seed Function
  const seedInitialData = useCallback(async (): Promise<number> => {
    const batch = writeBatch(db);
    let added = 0;

    for (const bundle of SEED_EMPLOYEES_SMPN1_PACET) {
      const empRef = doc(db, 'employees', bundle.employee.id);
      const existingSnap = await getDoc(empRef);
      if (!existingSnap.exists()) {
        batch.set(empRef, {
          ...bundle.employee,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const contactRef = doc(db, 'employees', bundle.employee.id, 'private', 'contact');
        batch.set(contactRef, {
          ...bundle.privateContact,
          updatedAt: serverTimestamp(),
        });
        added += 1;
      }
    }

    if (added > 0) {
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'employees');
      }
    }
    return added;
  }, []);

  // Auto-seed once on first Admin visit if employees collection is empty
  useEffect(() => {
    if (
      authReady &&
      currentUser &&
      isAdmin &&
      !employeesLoading &&
      employees.length === 0 &&
      !autoSeededOnce
    ) {
      setAutoSeededOnce(true);
      seedInitialData().catch((err) => {
        console.error('Auto-seed failed:', err);
      });
    }
  }, [authReady, currentUser, isAdmin, employeesLoading, employees.length, autoSeededOnce, seedInitialData]);

  // Land non-admin employees directly on their Personal Data portal after sign-in
  useEffect(() => {
    if (authReady && currentUser && !initialTabResolved && userAccount) {
      setInitialTabResolved(true);
      if (!isAdmin) {
        setActiveTab('personal');
      } else {
        setActiveTab('directory');
      }
    }
  }, [authReady, currentUser, initialTabResolved, userAccount, isAdmin]);

  const mapAuthErrorMessage = (
    err: unknown
  ): { message: string; opNotAllowed: boolean; unauthorizedDomain: boolean } => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
      return {
        message: `Domain deploy "${host}" belum terdaftar pada Authorized domains di Firebase Authentication.`,
        opNotAllowed: false,
        unauthorizedDomain: true,
      };
    }
    if (raw.includes('auth/operation-not-allowed')) {
      return {
        message: 'Metode login User/Email & Password belum diaktifkan pada Firebase Console proyek ini.',
        opNotAllowed: true,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
      return {
        message: 'Jendela login Google ditutup sebelum proses masuk selesai. Silakan coba lagi.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/popup-blocked')) {
      return {
        message: 'Popup login Google diblokir oleh browser. Mengalihkan ke halaman login Google...',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (
      raw.includes('auth/invalid-credential') ||
      raw.includes('auth/wrong-password') ||
      raw.includes('auth/user-not-found')
    ) {
      return {
        message:
          'Username/NIP/Email atau Password tidak sesuai. Jika belum pernah membuat akun, silakan klik tab "Aktivasi Akun Pegawai".',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/email-already-in-use')) {
      return {
        message: 'Username atau Email ini sudah terdaftar. Silakan masuk melalui tab Masuk User & Password.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/weak-password')) {
      return {
        message: 'Password terlalu lemah. Gunakan minimal 6 karakter.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/invalid-email')) {
      return {
        message: 'Format username atau email tidak valid.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/network-request-failed')) {
      return {
        message: 'Koneksi ke server autentikasi Firebase gagal. Periksa koneksi internet Anda.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/too-many-requests')) {
      return {
        message: 'Terlalu banyak percobaan login gagal. Silakan tunggu beberapa menit sebelum mencoba lagi.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/user-disabled')) {
      return {
        message: 'Akun ini dinonaktifkan. Hubungi Administrator kepegawaian.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    if (raw.includes('auth/account-exists-with-different-credential')) {
      return {
        message: 'Email ini sudah terdaftar dengan metode login lain. Gunakan metode masuk yang sesuai.',
        opNotAllowed: false,
        unauthorizedDomain: false,
      };
    }
    return { message: raw, opNotAllowed: false, unauthorizedDomain: false };
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/popup-blocked')) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          const mappedRedirect = mapAuthErrorMessage(redirectErr);
          setAuthError(mappedRedirect.message);
          setIsUnauthorizedDomain(mappedRedirect.unauthorizedDomain);
          return;
        }
      }
      const mapped = mapAuthErrorMessage(err);
      setAuthError(mapped.message);
      setIsUnauthorizedDomain(mapped.unauthorizedDomain);
    } finally {
      setSigningIn(false);
    }
  };

  const handlePasswordSignIn = async (identifier: string, password: string) => {
    setAuthError(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setSigningIn(true);
    try {
      const email = normalizeIdentifierToEmail(identifier);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const mapped = mapAuthErrorMessage(err);
      setAuthError(mapped.message);
      setIsOperationNotAllowed(mapped.opNotAllowed);
      setIsUnauthorizedDomain(mapped.unauthorizedDomain);
    } finally {
      setSigningIn(false);
    }
  };

  const handlePasswordRegister = async ({
    displayName,
    identifier,
    password,
    nip,
  }: {
    displayName: string;
    identifier: string;
    password: string;
    nip?: string;
  }) => {
    setAuthError(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setSigningIn(true);
    try {
      const email = normalizeIdentifierToEmail(identifier);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      if (nip) {
        setPendingClaimNip(nip);
      }
    } catch (err) {
      const mapped = mapAuthErrorMessage(err);
      setAuthError(mapped.message);
      setIsOperationNotAllowed(mapped.opNotAllowed);
      setIsUnauthorizedDomain(mapped.unauthorizedDomain);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSendPasswordReset = async (identifier: string) => {
    setAuthError(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setSigningIn(true);
    try {
      const email = normalizeIdentifierToEmail(identifier);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const mapped = mapAuthErrorMessage(err);
      setAuthError(mapped.message);
      throw err;
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSaveEmployeeModal = async (
    empData: Omit<Employee, 'createdAt' | 'updatedAt'>
  ) => {
    const empRef = doc(db, 'employees', empData.id);
    const existing = employees.find((e) => e.id === empData.id);
    try {
      if (existing) {
        await updateDoc(empRef, {
          ...empData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(empRef, {
          ...empData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `employees/${empData.id}`);
    }
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const contactRef = doc(db, 'employees', deleteTarget.id, 'private', 'contact');
      const contactSnap = await getDoc(contactRef);
      if (contactSnap.exists()) {
        await deleteDoc(contactRef);
      }
      await deleteDoc(doc(db, 'employees', deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `employees/${deleteTarget.id}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleClaimEmployee = useCallback(async (employeeId: string) => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      const empRef = doc(db, 'employees', employeeId);
      batch.update(empRef, {
        ownerUid: currentUser.uid,
        updatedAt: serverTimestamp(),
      });
      const userRef = doc(db, 'users', currentUser.uid);
      batch.update(userRef, {
        employeeId,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${employeeId}`);
    }
  }, [currentUser]);

  // Auto-claim employee profile by NIP if employee registered with NIP
  useEffect(() => {
    if (!currentUser || !pendingClaimNip || employeesLoading || myEmployee || !userAccount) return;
    const match = employees.find((e) => e.nip === pendingClaimNip && !e.ownerUid);
    setPendingClaimNip(null);
    if (match) {
      handleClaimEmployee(match.id).catch((err) => console.error('Auto-claim NIP failed:', err));
    }
  }, [currentUser, pendingClaimNip, employeesLoading, employees, myEmployee, userAccount, handleClaimEmployee]);

  const handleCreateOwnEmployee = async (
    empData: Omit<Employee, 'createdAt' | 'updatedAt'>,
    contactData: Omit<EmployeePrivateContact, 'updatedAt'>
  ) => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      const empRef = doc(db, 'employees', empData.id);
      batch.set(empRef, {
        ...empData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const contactRef = doc(db, 'employees', empData.id, 'private', 'contact');
      batch.set(contactRef, {
        ...contactData,
        updatedAt: serverTimestamp(),
      });
      const userRef = doc(db, 'users', currentUser.uid);
      batch.update(userRef, {
        employeeId: empData.id,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `employees/${empData.id}`);
    }
  };

  const handleUpdateOwnProfile = async (
    employeeId: string,
    personalPatch: Partial<Employee>,
    contactData: Omit<EmployeePrivateContact, 'updatedAt'>
  ) => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      const empRef = doc(db, 'employees', employeeId);
      batch.update(empRef, {
        ...personalPatch,
        updatedAt: serverTimestamp(),
      });
      const contactRef = doc(db, 'employees', employeeId, 'private', 'contact');
      const contactSnap = await getDoc(contactRef);
      if (contactSnap.exists()) {
        batch.update(contactRef, {
          ...contactData,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(contactRef, {
          ...contactData,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${employeeId}`);
    }
  };

  const handleSubmitAttendance = async ({
    employee,
    status,
    notes,
  }: {
    employee: Employee;
    status: AttendanceStatus;
    notes: string;
  }) => {
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const attId = `${employee.id}_${today}`;
    const attRef = doc(db, 'attendance', attId);
    try {
      await setDoc(attRef, {
        id: attId,
        schoolCode: 'SMPN1PACET',
        employeeId: employee.id,
        ownerUid: employee.ownerUid || currentUser.uid,
        employeeName: employee.nama,
        nip: employee.nip,
        departemen: employee.departemen,
        date: today,
        status,
        checkInTime: nowTime,
        checkOutTime: '',
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `attendance/${attId}`);
    }
  };

  const handleCheckOut = async (record: AttendanceRecord) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const attRef = doc(db, 'attendance', record.id);
    try {
      await updateDoc(attRef, {
        checkOutTime: nowTime,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${record.id}`);
    }
  };

  const handleToggleVerifyEmployee = async (emp: Employee) => {
    try {
      await updateDoc(doc(db, 'employees', emp.id), {
        isVerifiedByAdmin: !emp.isVerifiedByAdmin,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${emp.id}`);
    }
  };

  const handleGrantAdminToEmployee = async (emp: Employee) => {
    if (!emp.ownerUid) return;
    try {
      await setDoc(doc(db, 'admins', emp.ownerUid), {
        uid: emp.ownerUid,
        email: `${emp.id}@smpn1pacet.sch.id`,
        name: emp.nama,
        role: 'admin',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `admins/${emp.ownerUid}`);
    }
  };

  const handleSaveSchoolProfile = async (
    profileData: Omit<SchoolProfile, 'updatedAt'>
  ) => {
    const schoolRef = doc(db, 'school_profile', 'smpn1pacet');
    try {
      const snap = await getDoc(schoolRef);
      const payload = {
        ...profileData,
        id: 'smpn1pacet',
        schoolCode: 'SMPN1PACET' as const,
        updatedAt: serverTimestamp(),
      };
      if (snap.exists()) {
        await updateDoc(schoolRef, payload);
      } else {
        await setDoc(schoolRef, payload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'school_profile/smpn1pacet');
    }
  };

  if (fatalError) {
    throw fatalError;
  }

  // Loading Splash
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Memuat sistem kepegawaian...</div>
      </div>
    );
  }

  // Unauthenticated Portal Login Screen
  if (!currentUser) {
    return (
      <AuthLoginPortal
        signingIn={signingIn}
        authError={authError}
        isOperationNotAllowed={isOperationNotAllowed}
        isUnauthorizedDomain={isUnauthorizedDomain}
        onGoogleSignIn={handleSignIn}
        onPasswordSignIn={handlePasswordSignIn}
        onPasswordRegister={handlePasswordRegister}
        onSendPasswordReset={handleSendPasswordReset}
      />
    );
  }

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'directory', label: 'Direktori Pegawai', icon: <Users className="w-4 h-4" /> },
    { id: 'duk', label: 'Daftar Urut (DUK)', icon: <Award className="w-4 h-4" /> },
    { id: 'attendance', label: 'Absensi Real-Time', icon: <Activity className="w-4 h-4" /> },
    { id: 'personal', label: 'Data Pribadi Saya', icon: <UserCircle2 className="w-4 h-4" /> },
    { id: 'school', label: 'Profil Sekolah', icon: <Landmark className="w-4 h-4" /> },
    ...(isAdmin
      ? [{ id: 'admin' as NavTab, label: 'Pengaturan Admin', icon: <Settings className="w-4 h-4" /> }]
      : []),
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || 'Kepegawaian';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            {schoolProfile.logoSekolah ? (
              <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0">
                <img
                  src={schoolProfile.logoSekolah}
                  alt={`Logo ${schoolProfile.namaSekolah}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display font-semibold text-sm text-slate-900 truncate">
                {schoolProfile.namaSekolah}
              </div>
              <div className="text-xs text-slate-500 truncate">Disdikpora Kab. Cianjur</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 truncate">
              {currentUser.displayName || currentUser.email}
            </div>
            <div className="text-slate-500 truncate mt-0.5">{currentUser.email}</div>
            <div className="text-sky-700 font-medium mt-1">
              {isAdmin ? 'Administrator Kepegawaian' : 'Akun Pegawai Pribadi'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/50 flex">
          <div className="w-72 bg-white h-full flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {schoolProfile.logoSekolah ? (
                  <img
                    src={schoolProfile.logoSekolah}
                    alt={`Logo ${schoolProfile.namaSekolah}`}
                    className="w-7 h-7 object-contain shrink-0"
                  />
                ) : null}
                <span className="font-display font-semibold text-sm text-slate-900 truncate">
                  {schoolProfile.namaSekolah}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                    activeTab === item.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Contextual Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              <span>Disdikpora Kab. Cianjur</span>
              <span className="mx-2" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-600">
              {isAdmin ? 'Mode Administrator' : 'Mode Pegawai'} ·{' '}
              <span className="font-medium text-slate-900">
                {myEmployee ? myEmployee.nama : currentUser.displayName || currentUser.email}
              </span>
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          {activeTab === 'directory' && (
            <EmployeeDirectoryView
              employees={employees}
              loading={employeesLoading}
              isAdmin={isAdmin}
              myEmployeeId={myEmployee?.id || null}
              schoolProfile={schoolProfile}
              onAddEmployee={() => setEditingModalEmployee(null)}
              onEditEmployee={(emp) => setEditingModalEmployee(emp)}
              onDeleteEmployee={(emp) => setDeleteTarget(emp)}
              onNavigatePersonal={() => setActiveTab('personal')}
            />
          )}

          {activeTab === 'duk' && (
            <DUKView
              employees={employees}
              isAdmin={isAdmin}
              schoolProfile={schoolProfile}
              onEditEmployee={(emp) => setEditingModalEmployee(emp)}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceDashboardView
              employees={employees}
              attendanceRecords={attendanceRecords}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              myEmployee={myEmployee}
              isAdmin={isAdmin}
              onSubmitAttendance={handleSubmitAttendance}
              onCheckOut={handleCheckOut}
              onNavigatePersonal={() => setActiveTab('personal')}
            />
          )}

          {activeTab === 'personal' && (
            <PersonalProfileView
              currentUser={currentUser}
              employees={employees}
              myEmployee={myEmployee}
              myPrivateContact={myPrivateContact}
              onClaimEmployee={handleClaimEmployee}
              onCreateOwnEmployee={handleCreateOwnEmployee}
              onUpdateOwnProfile={handleUpdateOwnProfile}
            />
          )}

          {activeTab === 'school' && (
            <SchoolProfileView
              schoolProfile={schoolProfile}
              isAdmin={isAdmin}
              onSaveSchoolProfile={handleSaveSchoolProfile}
            />
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminSettingsView
              employees={employees}
              onSeedInitialData={seedInitialData}
              onToggleVerifyEmployee={handleToggleVerifyEmployee}
              onGrantAdminToEmployee={handleGrantAdminToEmployee}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Employee Modal (Administrator) */}
      {editingModalEmployee !== undefined && (
        <EmployeeModal
          initialEmployee={editingModalEmployee}
          onClose={() => setEditingModalEmployee(undefined)}
          onSave={handleSaveEmployeeModal}
        />
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Konfirmasi Hapus Data Pegawai
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data pegawai{' '}
              <span className="font-semibold text-slate-900">{deleteTarget.nama}</span> (NIP:{' '}
              <span className="font-mono-tabular">{deleteTarget.nip}</span>)? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmployee}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Hapus Pegawai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
