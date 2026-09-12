import { ArrowRight } from 'lucide-react';
import type { HomeNewsItem } from '../types/publicHome.types';

type HomeNewsSectionProps = {
  news: HomeNewsItem[];
};

export function HomeNewsSection({ news }: HomeNewsSectionProps) {
  return (
    <section id="public-news" className="scroll-mt-24 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-brand-700">{'News & Announcements'}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">ข่าวประชาสัมพันธ์ล่าสุด</h2>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ดูข่าวทั้งหมด
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {news.map((item) => (
            <article key={item.title} className="rounded-[18px] bg-gradient-to-br from-fuchsia-500 via-pink-400 to-violet-500 p-[3px]">
              <div className="h-full rounded-[15px] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md bg-fuchsia-50 px-2.5 py-1 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-500">{item.dateLabel}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-7 tracking-normal text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
