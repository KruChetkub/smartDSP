import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  Coins,
  FileBarChart,
  Landmark,
  Microscope,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { HomeFooter } from '../components/HomeFooter';
import { usePublicPageAnalytics } from '../hooks/usePublicPageAnalytics';
import {
  defaultPublicHomeContent,
  loadPublicHomeContentOrDefaults,
  PUBLIC_HOME_CONTENT_UPDATED_EVENT,
  type PublicHomeColorKey,
  type PublicHomeIconKey,
} from '../services/publicHomeContent.service';
import { getDefaultRepositoryCategories, loadPublicRepositoryCategories } from '../services/publicRepositoryCategories.service';

const sdgGoals = Array.from({ length: 17 }, (_, index) => {
  const number = index + 1;

  return {
    number,
    imageUrl: `/sdg/goal-${String(number).padStart(2, '0')}.jpg`,
  };
});

const activeSdgGoals = new Set([1, 3, 6, 13]);

const homeIconMap: Record<PublicHomeIconKey, typeof Landmark> = {
  landmark: Landmark,
  target: Target,
  'file-chart': FileBarChart,
  briefcase: BriefcaseBusiness,
  shield: ShieldCheck,
  clipboard: ClipboardCheck,
  coins: Coins,
  microscope: Microscope,
};

const planColorMap: Record<PublicHomeColorKey, string> = {
  blue: 'bg-blue-700', emerald: 'bg-emerald-700', violet: 'bg-violet-700',
  orange: 'bg-orange-600', rose: 'bg-rose-600', teal: 'bg-teal-700',
};

const policyToneMap: Record<PublicHomeColorKey, string> = {
  blue: 'border-blue-200/80 bg-blue-50/35 text-blue-700 backdrop-blur-[2px]',
  emerald: 'border-emerald-200/80 bg-emerald-50/35 text-emerald-700 backdrop-blur-[2px]',
  violet: 'border-violet-200/80 bg-violet-50/35 text-violet-700 backdrop-blur-[2px]',
  orange: 'border-orange-200/80 bg-orange-50/35 text-orange-700 backdrop-blur-[2px]',
  rose: 'border-pink-200/80 bg-pink-50/35 text-pink-700 backdrop-blur-[2px]',
  teal: 'border-teal-200/80 bg-teal-50/35 text-teal-700 backdrop-blur-[2px]',
};

export function StrategicPolicyHomePage() {
  usePublicPageAnalytics();
  const [homeContent, setHomeContent] = useState(defaultPublicHomeContent);
  const [homeSections, setHomeSections] = useState(() => getDefaultRepositoryCategories('home'));

  useEffect(() => {
    document.title = 'ศูนย์รวมนโยบายและยุทธศาสตร์';

    return () => {
      document.title = 'SmartDSP';
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadContent = () => void Promise.all([
      loadPublicHomeContentOrDefaults(),
      loadPublicRepositoryCategories('home').catch(() => getDefaultRepositoryCategories('home')),
    ]).then(([items, sections]) => {
      if (isMounted) {
        setHomeContent(items);
        setHomeSections(sections.length > 0 ? sections : getDefaultRepositoryCategories('home'));
      }
    });
    const handleContentUpdated = () => loadContent();

    loadContent();
    window.addEventListener(PUBLIC_HOME_CONTENT_UPDATED_EVENT, handleContentUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener(PUBLIC_HOME_CONTENT_UPDATED_EVENT, handleContentUpdated);
    };
  }, []);

  const publishedContent = homeContent.filter((item) => item.status === 'published');
  const displayedSections = homeSections.filter((section) => section.isActive).sort((first, second) => first.sortOrder - second.sortOrder);
  const displayItems = (sectionKey: string) => publishedContent.filter((item) => item.section === sectionKey).sort((first, second) => first.sortOrder - second.sortOrder).map((item) => ({
    ...item,
    icon: homeIconMap[item.iconKey],
    color: planColorMap[item.colorKey],
    tone: policyToneMap[item.colorKey],
    to: `/strategic-repository?view=${item.targetView}`,
  }));
  const visibleSections = displayedSections.filter((section) => publishedContent.some((item) => item.section === section.key));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="relative isolate overflow-hidden border-b border-emerald-200 bg-[url('/SmartDSP.png')] bg-cover bg-[position:center_82%] bg-no-repeat sm:bg-[length:100%_auto]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.90)_28%,rgba(255,255,255,0.90)_72%,rgba(255,255,255,0.72)_100%)]" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-32 max-w-[1600px] gap-3 px-4 py-2 sm:min-h-36 sm:px-6 lg:grid-cols-[10rem_minmax(0,1fr)_10rem] lg:items-center lg:px-8">
          <div className="flex items-center justify-center lg:block">
            <div className="inline-flex rounded-md border border-emerald-100 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm lg:block lg:w-fit lg:mx-auto">
              <img src="/DDC_0.png" alt="ตราสัญลักษณ์กรมควบคุมโรค" className="h-[4.5rem] w-auto object-contain lg:h-[5.5rem]" />
            </div>
          </div>
          <div className="text-center lg:px-3">
            <p className="text-sm font-semibold text-emerald-700">ศูนย์รวมนโยบายและยุทธศาสตร์</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-normal text-[#12326b] sm:text-4xl lg:text-[2.75rem]">
              นโยบายและยุทธศาสตร์
            </h1>
            <p className="mt-1.5 text-lg font-bold leading-7 text-emerald-800 sm:text-2xl">
              ด้านการป้องกันควบคุมโรคและภัยสุขภาพของประเทศ
            </p>
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
        </div>
      </header>

      <main className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#F4FBFF_0%,#E9F8FA_46%,#F7FBFF_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(8,120,216,0.10),rgba(18,184,177,0.12)_48%,rgba(255,255,255,0)_72%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(170deg,rgba(6,59,120,0.10)_0%,rgba(255,255,255,0)_58%)]" aria-hidden="true" />
        <div className="relative">
        <section className="border-b border-slate-200/80 bg-white/65 py-2">
          <div className="mx-auto max-w-[1760px] px-3 sm:px-5 lg:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex shrink-0 justify-center lg:w-40 lg:justify-start xl:w-44">
                <img
                  src="/sdg/E_SDG_logo_without_UN_emblem_square_RGB-1024x606-1.webp"
                  alt="Sustainable Development Goals เป้าหมายการพัฒนาที่ยั่งยืน"
                  className="h-auto w-32 object-contain sm:w-36 lg:w-36 xl:w-40"
                />
              </div>
              <div className="flex flex-1 gap-2 overflow-x-auto px-1 py-1.5 lg:grid lg:grid-cols-[repeat(17,minmax(0,1fr))] lg:gap-2 lg:overflow-visible xl:gap-2.5">
                {sdgGoals.map((goal) => {
                  const isActive = activeSdgGoals.has(goal.number);

                  return (
                    <div
                      key={goal.number}
                      className={`block w-24 shrink-0 overflow-hidden rounded-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-28 lg:w-auto ${
                        isActive ? 'sdg-active-goal relative z-10 origin-center scale-[1.18]' : ''
                      }`}
                      title={isActive
                        ? `เป้าหมายการพัฒนาที่ยั่งยืนที่ ${goal.number} ซึ่งกรมควบคุมโรคกำลังขับเคลื่อน`
                        : `เป้าหมายการพัฒนาที่ยั่งยืนที่ ${goal.number}`}
                      aria-label={isActive
                        ? `SDG ${goal.number} เป้าหมายที่กรมควบคุมโรคกำลังขับเคลื่อน`
                        : `SDG ${goal.number}`}
                    >
                      <img
                        src={goal.imageUrl}
                        alt={`โลโก้เป้าหมายการพัฒนาที่ยั่งยืนที่ ${goal.number}`}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-1 text-center text-m font-medium leading-5 text-slate-1000">
              การดำเนินงานของกรมควบคุมโรคเชื่อมโยงเป้าหมายการพัฒนาที่ยั่งยืน เพื่อสุขภาพที่ดีและการพัฒนาที่ยั่งยืนของประเทศ
            </p>
          </div>
        </section>

        {visibleSections.map((section) => {
          const items = displayItems(section.key);
          const isPrimaryPlanSection = section.key === 'plan';
          return (
            <section key={section.id} className="border-b border-slate-200/60 bg-transparent py-3">
              <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
                {isPrimaryPlanSection ? (
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{section.label}</h2>
                  </div>
                ) : null}
                {isPrimaryPlanSection ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const cardContent = <>
                        <div className="flex w-full justify-center">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt={`โลโก้ ${item.title}`}
                              className="h-20 w-20 sm:h-22 sm:w-22 rounded-full border-2 border-white bg-white object-contain p-1 shadow-md ring-1 ring-slate-200/80 transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <span className={`flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-full text-white shadow-md transition-transform duration-200 group-hover:scale-105 ${item.color}`}>
                              <Icon className="h-9 w-9" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3.5 line-clamp-3 text-xs sm:text-sm font-bold leading-snug text-slate-950 transition-colors group-hover:text-emerald-800">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-3 text-[11px] sm:text-xs leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                        <span className="mt-auto inline-flex items-center justify-center gap-1.5 pt-3.5 text-xs font-semibold text-emerald-700 transition-colors group-hover:text-emerald-800">
                          {item.actionLabel}
                          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                        </span>
                      </>;
                      const cardClassName = 'group flex min-h-[16rem] w-full flex-col items-center justify-between rounded-xl border border-white/90 bg-white/75 p-4 sm:p-5 text-center shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-md';
                      return item.pdfUrl
                        ? <a key={item.id} href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className={cardClassName}>{cardContent}</a>
                        : <Link key={item.id} to={item.to} className={cardClassName}>{cardContent}</Link>;
                    })}
                  </div>
                ) : (
                  <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return <div key={item.id} className="flex min-w-0 flex-col">
                        <div className="mb-3 flex items-center gap-3 px-1">
                          <h2 className="min-w-0 text-lg font-bold leading-7 text-slate-950">{item.title}</h2>
                        </div>
                        <article className={`flex-1 rounded-md border p-5 ${item.tone}`}>
                          <div className="flex items-start gap-5">
                            {item.logoUrl ? <img src={item.logoUrl} alt={`โลโก้ ${item.title}`} className="h-20 w-20 shrink-0 rounded-full border-2 border-white bg-white object-contain p-0.5 shadow-md ring-1 ring-current/20" /> : <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-white shadow-md ${item.color}`}><Icon className="h-9 w-9" /></span>}
                            <div className="min-w-0 flex-1"><p className="text-sm leading-6 text-slate-700">{item.description}</p>{item.pdfUrl ? <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-current bg-white px-3 text-sm font-semibold hover:bg-white/60">{item.actionLabel}<ArrowRight className="h-4 w-4" /></a> : <Link to={item.to} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-current bg-white px-3 text-sm font-semibold hover:bg-white/60">{item.actionLabel}<ArrowRight className="h-4 w-4" /></Link>}</div>
                          </div>
                        </article>
                      </div>;
                    })}
                  </div>
                )}
              </div>
            </section>
          );
        })}

        </div>
      </main>

      <HomeFooter />
      <CookieConsentBanner />
    </div>
  );
}
