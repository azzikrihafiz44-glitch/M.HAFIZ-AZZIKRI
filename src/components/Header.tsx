import React from 'react';
import {
  LogOut,
  Moon,
  Radio,
  Shield,
  SlidersHorizontal,
  Sun,
  UserCircle2,
} from 'lucide-react';
import type { AppView } from '../types/quiz';
import type { PortalTab } from '../data/academicCatalog';
import { UI_TRANSLATIONS, type UserWebLanguage } from '../utils/webSettings';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  brandName?: string;
  currentView: AppView;
  adminNavUnlocked: boolean;
  theme: 'dark' | 'light';
  language?: UserWebLanguage;
  liveCount?: number;
  userEmail?: string | null;
  participantPhotoUrl?: string;
  isAdminSession?: boolean;
  playStoreUrl?: string;
  appStoreUrl?: string;
  microsoftStoreUrl?: string;
  microsoftStoreId?: string;
  onToggleTheme: () => void;
  onOpenWebSettings: () => void;
  onOpenParticipantAuth?: (mode?: 'register' | 'login' | 'profile') => void;
  onBrandClick: () => void;
  onOpenPortals: (tab?: PortalTab) => void;
  onOpenCampusAnalysis: () => void;
  onOpenAbout: () => void;
  onOpenTutorial: () => void;
  onOpenWardrobe: () => void;
  onSwitchStudent: () => void;
  onOpenAdminGate: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  brandName = 'Hafiz Education',
  currentView,
  adminNavUnlocked,
  theme,
  language = 'id',
  liveCount = 0,
  userEmail = null,
  participantPhotoUrl = '',
  isAdminSession = false,
  playStoreUrl = '',
  appStoreUrl = '',
  microsoftStoreUrl = '',
  microsoftStoreId = '',
  onToggleTheme,
  onOpenWebSettings,
  onOpenParticipantAuth,
  onBrandClick,
  onOpenPortals,
  onOpenCampusAnalysis,
  onOpenAbout,
  onOpenTutorial,
  onOpenWardrobe,
  onSwitchStudent,
  onOpenAdminGate,
  onLogout,
}) => {
  const canLogout = Boolean((userEmail || isAdminSession) && onLogout);
  const showAdminTab = adminNavUnlocked;
  const t = UI_TRANSLATIONS[language];

  return (
    <header className="sticky top-0 z-40 border-b border-sky-400/15 bg-[#071124]/88 backdrop-blur-2xl shadow-[0_8px_32px_rgba(3,10,28,0.55)]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Wordmark (5x klik untuk akses rahasia Admin) */}
        <button
          type="button"
          id="brand-secret-trigger"
          onClick={onBrandClick}
          className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 rounded-xl min-w-0 shrink"
          aria-label={`${brandName} — ${t.navHome}`}
        >
          <span className="p-[1.5px] rounded-xl bg-gradient-to-br from-amber-300/80 via-sky-400/70 to-teal-400/70 group-hover:scale-105 transition shrink-0">
            <img
              src="/assets/aistudio/Favicon_0fd84ae5.png"
              alt={`Logo ${brandName}`}
              className="w-8 h-8 rounded-[10px] object-cover bg-[#071124] block"
            />
          </span>
          <span className="font-display font-bold text-sm sm:text-[17px] tracking-tight text-gold-gradient whitespace-nowrap truncate">
            {brandName}
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-[13px] font-medium text-slate-300">
          <button
            type="button"
            onClick={onSwitchStudent}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              currentView === 'landing'
                ? 'text-amber-300 border-amber-400 font-semibold'
                : 'border-transparent hover:text-sky-200 hover:border-sky-400/60'
            }`}
          >
            {t.navHome}
          </button>
          <button
            type="button"
            id="btn-nav-portal-belajar"
            onClick={() => onOpenPortals('tryout-utbk')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              currentView === 'portals'
                ? 'text-amber-300 border-amber-400 font-semibold'
                : 'border-transparent hover:text-sky-200 hover:border-sky-400/60'
            }`}
          >
            {t.navPortal}
          </button>
          <button
            type="button"
            id="btn-nav-campus-analysis"
            onClick={onOpenCampusAnalysis}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              currentView === 'campus-analysis'
                ? 'text-amber-300 border-amber-400 font-semibold'
                : 'border-transparent hover:text-sky-200 hover:border-sky-400/60'
            }`}
          >
            {t.navCampus}
          </button>
          <button
            type="button"
            id="btn-nav-kedinasan"
            onClick={() => onOpenPortals('kedinasan')}
            className="border-b-2 border-transparent hover:text-teal-200 hover:border-teal-400/60 py-1 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navKedinasan}
          </button>
          <button
            type="button"
            id="btn-nav-live-teaching"
            onClick={() => onOpenPortals('live-teaching')}
            className="inline-flex items-center gap-1.5 border-b-2 border-transparent hover:text-sky-200 hover:border-sky-400/60 py-1 transition-colors whitespace-nowrap shrink-0 text-sky-200 font-semibold"
          >
            {liveCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" aria-hidden="true" />
            ) : (
              <Radio className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            )}
            <span>
              {t.navLiveTeaching}
              {liveCount > 0 ? ` (${liveCount})` : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenAbout}
            className={`${showAdminTab ? 'hidden 2xl:inline-flex' : 'hidden xl:inline-flex'} border-b-2 border-transparent hover:text-sky-200 hover:border-sky-400/60 py-1 transition-colors whitespace-nowrap shrink-0`}
          >
            {t.navAbout}
          </button>
          <button
            type="button"
            onClick={onOpenTutorial}
            className={`${showAdminTab ? 'hidden 2xl:inline-flex' : 'hidden xl:inline-flex'} border-b-2 border-transparent hover:text-sky-200 hover:border-sky-400/60 py-1 transition-colors whitespace-nowrap shrink-0`}
          >
            {t.navGuide}
          </button>
          {showAdminTab && (
            <button
              type="button"
              id="portal-tab-admin"
              onClick={onOpenAdminGate}
              className={`inline-flex items-center gap-1.5 border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 font-semibold ${
                currentView === 'admin'
                  ? 'text-amber-300 border-amber-400'
                  : 'text-amber-200 border-transparent hover:text-amber-100 hover:border-amber-400/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Studio Admin</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Crisp Action & Account Cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenPortals('tryout-utbk')}
            className="hidden sm:inline-flex md:hidden px-2.5 py-2 rounded-xl bg-sky-500/10 border border-sky-400/20 text-xs font-semibold text-sky-100 transition whitespace-nowrap shrink-0"
          >
            {t.navPortal}
          </button>
          <button
            type="button"
            id="btn-nav-campus-mobile"
            onClick={onOpenCampusAnalysis}
            aria-label={t.navCampus}
            title={t.navCampus}
            className="hidden sm:inline-flex md:hidden px-2.5 py-2 rounded-xl bg-teal-500/10 border border-teal-400/25 text-xs font-semibold text-teal-100 transition whitespace-nowrap shrink-0"
          >
            Kampus
          </button>

          {showAdminTab && (
            <button
              type="button"
              id="portal-tab-admin-mobile"
              onClick={onOpenAdminGate}
              aria-label="Studio Admin"
              title="Studio Admin"
              className="md:hidden inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/15 border border-amber-400/35 text-xs font-semibold text-amber-200 transition whitespace-nowrap shrink-0"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <PWAInstallButton
            variant="header"
            language={language}
            playStoreUrl={playStoreUrl}
            appStoreUrl={appStoreUrl}
            microsoftStoreUrl={microsoftStoreUrl}
            microsoftStoreId={microsoftStoreId}
          />

          {onOpenParticipantAuth && (
            <button
              type="button"
              id="btn-header-participant-auth"
              onClick={() => onOpenParticipantAuth(userEmail ? 'profile' : 'login')}
              title={userEmail ? `Profil Peserta (${userEmail})` : 'Masuk / Daftar Akun Peserta'}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/12 hover:bg-sky-500/22 border border-sky-400/25 text-xs font-semibold text-sky-100 transition whitespace-nowrap shrink-0"
            >
              {participantPhotoUrl ? (
                <img
                  src={participantPhotoUrl}
                  alt="Foto profil"
                  className="w-4 h-4 rounded-full object-cover border border-amber-300/70"
                />
              ) : (
                <UserCircle2 className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
              )}
              <span>{userEmail ? 'Profil' : 'Masuk / Daftar'}</span>
            </button>
          )}

          <button
            type="button"
            id="btn-open-web-settings"
            onClick={onOpenWebSettings}
            aria-label={t.navSettings}
            title={t.navSettings}
            className="p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-sky-200 transition whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
            <span className="hidden 2xl:inline">{t.navSettings}</span>
          </button>

          <button
            type="button"
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            className="p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-amber-300 transition whitespace-nowrap shrink-0 hidden md:inline-flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenWardrobe}
            className="btn-gold px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0"
          >
            Avatar
          </button>

          {canLogout && (
            <button
              type="button"
              id="btn-header-logout"
              onClick={onLogout}
              aria-label={t.logoutLabel}
              title={userEmail ? `Keluar dari ${userEmail}` : 'Keluar Sesi'}
              className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 text-[11px] sm:text-xs font-semibold text-rose-200 transition whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">{t.logoutLabel}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
