import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Download, ExternalLink, Monitor, Smartphone, X, Zap } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { resolveDirectStoreLinks } from '../utils/appStoreDistribution';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'settings';
  language?: 'id' | 'en';
  playStoreUrl?: string;
  appStoreUrl?: string;
  microsoftStoreUrl?: string;
  microsoftStoreId?: string;
  onInstalled?: () => void;
}

type StorePlatformTab = 'android' | 'ios' | 'microsoft';

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  language = 'id',
  playStoreUrl = '',
  appStoreUrl = '',
  microsoftStoreUrl = '',
  microsoftStoreId = '',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<StorePlatformTab>(() => (isIOS ? 'ios' : 'android'));
  const isEn = language === 'en';

  const resolvedStores = resolveDirectStoreLinks({
    playStoreUrl,
    appStoreUrl,
    microsoftStoreUrl,
    microsoftStoreId,
  });

  const handleInstallClick = async (preferredTab: StorePlatformTab = isIOS ? 'ios' : 'android') => {
    if (isInstallable && preferredTab !== 'ios') {
      const accepted = await install();
      if (accepted) {
        onInstalled?.();
      }
      return;
    }
    setGuideTab(preferredTab);
    setShowGuideModal(true);
  };

  if (isInstalled && variant === 'header') {
    return null;
  }

  const renderStoreActionButtons = (compact = false) => (
    <div className={`grid grid-cols-1 sm:grid-cols-3 ${compact ? 'gap-2' : 'gap-2.5'}`}>
      <a
        id={compact ? 'btn-store-playstore-settings' : 'btn-store-playstore'}
        href={resolvedStores.playStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2.5 rounded-xl bg-[#09162e]/85 hover:bg-[#0f2347]/95 border border-sky-400/15 hover:border-emerald-400/45 text-left flex items-center justify-between gap-2 transition group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 text-emerald-300"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3.61 1.814L13.793 12 3.61 22.186a1.5 1.5 0 0 1-.61-1.209V3.023c0-.508.248-.959.61-1.209zm11.244 11.246l2.893 2.893-11.02 6.277 8.127-9.17zm3.896-1.918l2.743 1.563c.676.385.676 1.205 0 1.59l-2.743 1.563-3.118-3.118 3.118-3.598zM6.727 1.77l11.02 6.277-2.893 2.893-8.127-9.17z" />
          </svg>
          <span className="min-w-0">
            <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight truncate">
              {isEn ? 'Get on' : 'Android'}
            </span>
            <span className="block text-xs font-bold text-white truncate">Google Play</span>
          </span>
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-sky-300/60 group-hover:text-emerald-300 shrink-0 transition" />
      </a>

      <a
        id={compact ? 'btn-store-appstore-settings' : 'btn-store-appstore'}
        href={resolvedStores.appStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2.5 rounded-xl bg-[#09162e]/85 hover:bg-[#0f2347]/95 border border-sky-400/15 hover:border-sky-400/50 text-left flex items-center justify-between gap-2 transition group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 text-sky-300"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.32c.67-.81 1.12-1.94 1-3.07-.96.04-2.13.64-2.82 1.45-.61.71-1.15 1.86-1.01 2.96 1.08.08 2.16-.53 2.83-1.34z" />
          </svg>
          <span className="min-w-0">
            <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight truncate">
              {isEn ? 'iOS & Mac' : 'iPhone / iPad'}
            </span>
            <span className="block text-xs font-bold text-white truncate">App Store</span>
          </span>
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-sky-300/60 group-hover:text-sky-300 shrink-0 transition" />
      </a>

      <a
        id={compact ? 'btn-store-microsoft-settings' : 'btn-store-microsoft'}
        href={resolvedStores.microsoftStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-2.5 rounded-xl bg-[#09162e]/85 hover:bg-[#0f2347]/95 border border-sky-400/15 hover:border-cyan-400/45 text-left flex items-center justify-between gap-2 transition group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 text-cyan-300"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3 3h8.5v8.5H3V3zm9.5 0H21v8.5h-8.5V3zM3 12.5h8.5V21H3v-8.5zm9.5 0H21V21h-8.5v-8.5z" />
          </svg>
          <span className="min-w-0">
            <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight truncate">
              Windows PC
            </span>
            <span className="block text-xs font-bold text-white truncate">Microsoft Store</span>
          </span>
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-sky-300/60 group-hover:text-cyan-300 shrink-0 transition" />
      </a>
    </div>
  );

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          id="btn-pwa-install-header"
          onClick={() => void handleInstallClick()}
          aria-label={
            isEn
              ? 'Get App (Play Store, App Store, Microsoft Store)'
              : 'Unduh Aplikasi (Play Store, App Store & Microsoft Store)'
          }
          title={
            isEn
              ? 'Download HafizEdu App (Play Store / App Store / Microsoft Store)'
              : 'Unduh Aplikasi HafizEdu (Play Store, App Store & Microsoft Store)'
          }
          className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-[11px] sm:text-xs font-semibold text-sky-100 transition whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
          <span className="hidden lg:inline">{isEn ? 'Get App' : 'Unduh App'}</span>
          <span className="lg:hidden">App</span>
        </button>
      ) : variant === 'settings' ? (
        <div className="space-y-2.5 w-full">
          {renderStoreActionButtons(true)}
          {!isInstalled && (
            <button
              type="button"
              id="btn-pwa-install-settings"
              onClick={() => void handleInstallClick()}
              className="btn-gold w-full px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isEn ? 'Install App Directly Now' : 'Pasang Aplikasi Langsung (1-Klik)'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0 text-sky-300">
                <Smartphone className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  {isEn ? 'Hafiz Education App' : 'Aplikasi Multi-Platform'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {isEn
                    ? 'Available on Google Play, App Store, Microsoft Store & Offline PWA'
                    : 'Tersedia di Google Play, App Store, Microsoft Store & Mode Offline'}
                </p>
              </div>
            </div>
            {!isInstalled && (
              <button
                type="button"
                id="btn-pwa-install-card"
                onClick={() => void handleInstallClick()}
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-100 font-semibold text-xs shrink-0 whitespace-nowrap transition inline-flex items-center gap-1.5"
              >
                {isInstallable ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                    <span>{isEn ? '1-Click Install' : 'Pasang 1-Klik'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                    <span>{isEn ? 'Install App' : 'Pasang App'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {renderStoreActionButtons(false)}
        </div>
      )}

      {showGuideModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="modal-pwa-install-guide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-guide-title"
            className="fixed inset-0 z-[100] bg-[#050b18]/88 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="hero-glow-card holo-top-beam w-full max-w-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-sky-300">
                    Play Store · App Store · Microsoft Store
                  </p>
                  <h3 id="pwa-guide-title" className="font-display text-xl font-bold text-white mt-0.5">
                    Unduh Aplikasi HafizEdu
                  </h3>
                </div>
                <button
                  type="button"
                  id="btn-close-pwa-guide"
                  onClick={() => setShowGuideModal(false)}
                  aria-label="Tutup panduan pasang aplikasi"
                  className="w-8 h-8 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-sky-100 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderStoreActionButtons(true)}

              <div className="grid grid-cols-3 gap-1.5 bg-[#071124]/90 p-1 rounded-xl border border-sky-400/20">
                {(
                  [
                    { id: 'android', label: 'Android / Play Store', icon: Smartphone },
                    { id: 'ios', label: 'iOS / App Store', icon: Smartphone },
                    { id: 'microsoft', label: 'Windows / PC', icon: Monitor },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      id={`btn-pwa-tab-${tab.id}`}
                      onClick={() => setGuideTab(tab.id)}
                      className={`py-2 px-2 rounded-lg text-[11px] font-semibold transition inline-flex items-center justify-center gap-1.5 ${
                        guideTab === tab.id
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {guideTab === 'android' && (
                <div className="p-4 rounded-2xl bg-[#09162e]/80 border border-sky-400/15 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">Android &amp; Google Play Store</p>
                    <a
                      href={resolvedStores.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                    >
                      <span>Buka Play Store</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  {isInstallable ? (
                    <div className="p-3 rounded-xl bg-[#071124]/80 border border-sky-400/20 space-y-2">
                      <p className="font-semibold text-sky-100">
                        Perangkat Anda mendukung pemasangan aplikasi langsung 1-klik:
                      </p>
                      <button
                        type="button"
                        onClick={() => void install()}
                        className="btn-gold w-full py-2.5 rounded-xl font-bold text-xs"
                      >
                        Pasang Aplikasi HafizEdu Sekarang
                      </button>
                    </div>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-300">
                      <li>
                        Klik tombol <strong>Buka Play Store</strong> di atas untuk mengakses Google Play Store, atau ketuk menu ⋮ di Chrome Android.
                      </li>
                      <li>
                        Pilih <strong>Install aplikasi</strong> atau <strong>Tambahkan ke Layar utama</strong>.
                      </li>
                      <li>
                        Ikon aplikasi <strong>HafizEdu</strong> tampil di menu HP Android Anda (layar penuh &amp; cepat tanpa bar browser).
                      </li>
                    </ol>
                  )}
                </div>
              )}

              {guideTab === 'ios' && (
                <div className="p-4 rounded-2xl bg-[#09162e]/80 border border-sky-400/15 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">iPhone / iPad &amp; Apple App Store</p>
                    <a
                      href={resolvedStores.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                    >
                      <span>Buka App Store</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-300">
                    <li>
                      Klik tombol <strong>Buka App Store</strong> di atas, atau buka halaman ini di Safari iPhone/iPad.
                    </li>
                    <li>
                      Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                    </li>
                    <li>
                      Gulir lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> dan ketuk <strong>Tambah</strong>.
                    </li>
                  </ol>
                </div>
              )}

              {guideTab === 'microsoft' && (
                <div className="p-4 rounded-2xl bg-[#09162e]/80 border border-sky-400/15 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white">
                      Windows 10/11 (Microsoft Store &amp; Edge/Chrome)
                    </p>
                    <a
                      href={resolvedStores.microsoftStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold px-3 py-1.5 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                    >
                      <span>Buka Microsoft Store</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  {isInstallable ? (
                    <div className="p-3 rounded-xl bg-[#071124]/80 border border-sky-400/20 space-y-2">
                      <p className="font-semibold text-sky-100">
                        Browser Windows/Mac Anda mendukung pemasangan aplikasi Desktop 1-klik:
                      </p>
                      <button
                        type="button"
                        onClick={() => void install()}
                        className="btn-gold w-full py-2.5 rounded-xl font-bold text-xs"
                      >
                        Pasang Aplikasi Desktop Sekarang
                      </button>
                    </div>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-300">
                      <li>
                        Klik tombol <strong>Buka Microsoft Store</strong> di atas untuk langsung menuju Microsoft Store, atau klik ikon Install (+) di Edge/Chrome Windows.
                      </li>
                      <li>
                        Atau buka menu <strong>⋯ → Aplikasi (Apps) → Instal situs ini sebagai aplikasi</strong>.
                      </li>
                      <li>
                        Aplikasi <strong>HafizEdu</strong> akan terpasang di Start Menu / Desktop Windows &amp; Launchpad Mac dengan jendela mandiri.
                      </li>
                    </ol>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-sky-100 text-xs font-semibold transition inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Penuh</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ language?: 'id' | 'en' }> = ({
  language = 'id',
}) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-[#071124] shadow-lg"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-[#071124] animate-pulse" aria-hidden="true" />
      <span>
        {language === 'en'
          ? 'Offline Mode — Locally cached data remains active'
          : 'Mode Offline — Data tersimpan lokal tetap aktif'}
      </span>
    </div>
  );
};
