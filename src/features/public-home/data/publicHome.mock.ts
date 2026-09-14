import {
  Activity,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  Goal,
  HeartPulse,
  Landmark,
  Megaphone,
  Newspaper,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { HomeFaqItem, HomeHeroBanner, HomeNewsItem, HomePlanSection, HomeQuickNavItem } from '../types/publicHome.types';

export const homeHeroBanner: HomeHeroBanner = {
  eyebrow: 'PTDMS Public Center',
  title: 'ศูนย์รวมข้อมูล แผนงาน และข่าวประชาสัมพันธ์',
  description:
    'ติดตามประกาศสำคัญ เอกสารเผยแพร่ และช่องทางเข้าสู่ระบบงานด้านแผนและพัฒนาบุคลากรของกองยุทธศาสตร์และแผนงาน',
  imageUrl: '/SmartDSP.png',
  imageOverlayOpacity: 58,
  actions: [
    { label: 'เข้าสู่ระบบ PTDMS', href: '/login', variant: 'primary' },
    { label: 'ดูแผนระดับต่าง ๆ', href: 'plan-levels', variant: 'secondary' },
  ],
};

export const homeQuickNavItems: HomeQuickNavItem[] = [
  { label: 'แผนระดับต่าง ๆ', targetId: 'plan-levels', icon: Goal },
  { label: 'แผนงานควบคุมโรค', targetId: 'disease-control-plan', icon: HeartPulse },
  { label: 'แนวทางประจำปี', targetId: 'annual-guidelines', icon: ClipboardCheck },
  { label: 'นโยบายผู้บริหาร', targetId: 'executive-policy', icon: UsersRound },
  { label: 'ข่าวประชาสัมพันธ์', targetId: 'public-news', icon: Newspaper },
];

export const homePlanSections: HomePlanSection[] = [
  {
    id: 'plan-levels',
    number: '1',
    title: 'แผนระดับต่าง ๆ',
    tone: 'emerald',
    cards: [
      {
        title: 'ยุทธศาสตร์ชาติ 20 ปี',
        subtitle: 'พ.ศ. 2561 - 2580',
        icon: Landmark,
        color: 'bg-blue-600',
        actionLabel: 'รายละเอียด',
      },
      {
        title: 'แผนแม่บทภายใต้ยุทธศาสตร์ชาติ',
        subtitle: 'พ.ศ. 2566 - 2580',
        description: 'ฉบับแก้ไขเพิ่มเติม',
        icon: Goal,
        color: 'bg-teal-600',
        actionLabel: 'รายละเอียด',
      },
      {
        title: 'แผนการปฏิรูปประเทศ',
        subtitle: 'ฉบับปรับปรุง',
        icon: BookOpenCheck,
        color: 'bg-amber-500',
        actionLabel: 'รายละเอียด',
      },
      {
        title: 'แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ 13',
        subtitle: 'พ.ศ. 2566 - 2570',
        icon: Activity,
        color: 'bg-violet-600',
        actionLabel: 'รายละเอียด',
      },
    ],
  },
  {
    id: 'disease-control-plan',
    number: '2',
    title: 'แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ',
    tone: 'rose',
    cards: [
      {
        title: 'แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ ระยะ 5 ปี',
        subtitle: 'พ.ศ. 2566 - 2570',
        description: 'Pinkbook',
        icon: FileText,
        color: 'bg-rose-500',
        actionLabel: 'เปิดเอกสาร',
      },
    ],
  },
  {
    id: 'annual-guidelines',
    number: '3',
    title: 'แนวทางดำเนินงานประจำปี',
    tone: 'blue',
    cards: [
      {
        title: 'แนวทางการดำเนินงานป้องกันควบคุมโรคและภัยสุขภาพ',
        subtitle: 'ประจำปีงบประมาณ',
        icon: ClipboardCheck,
        color: 'bg-sky-600',
        actionLabel: 'ดาวน์โหลดเอกสาร',
      },
    ],
  },
  {
    id: 'risk-management',
    number: '4',
    title: 'แผนบริหารความเสี่ยงยุทธศาสตร์',
    tone: 'violet',
    cards: [
      {
        title: 'แผนบริหารความเสี่ยงยุทธศาสตร์',
        subtitle: 'กรมควบคุมโรค',
        icon: ShieldCheck,
        color: 'bg-violet-600',
        actionLabel: 'ดูแผน/เอกสาร',
      },
    ],
  },
  {
    id: 'executive-policy',
    number: '5',
    title: 'นโยบายผู้บริหาร',
    tone: 'orange',
    cards: [
      {
        title: 'นโยบายรัฐมนตรีว่าการกระทรวงสาธารณสุข',
        subtitle: 'นโยบาย รมว.',
        icon: UsersRound,
        color: 'bg-orange-500',
        actionLabel: 'อ่านเพิ่มเติม',
      },
      {
        title: 'นโยบายอธิบดีกรมควบคุมโรค',
        subtitle: 'นโยบาย อธิบดี',
        icon: UsersRound,
        color: 'bg-red-500',
        actionLabel: 'อ่านเพิ่มเติม',
      },
    ],
  },
  {
    id: 'r2r-research',
    number: '6',
    title: 'งานวิจัยจากงานประจำ',
    tone: 'emerald',
    cards: [
      {
        title: 'งานวิจัยจากงานประจำ R2R',
        subtitle: 'Routine to Research',
        description: 'รวบรวมผลงานวิจัยจากงานประจำ',
        icon: FileText,
        color: 'bg-emerald-600',
        actionLabel: 'อ่านเพิ่มเติม',
      },
    ],
  },
];

export const homeNewsItems: HomeNewsItem[] = [
  {
    title: 'ประกาศแนวทางการจัดทำแผนและรายงานผลประจำปี',
    category: 'ประกาศ',
    dateLabel: '15 มิ.ย. 2569',
    description: 'รวบรวมขั้นตอนและเอกสารประกอบสำหรับหน่วยงานภายใน',
  },
  {
    title: 'เปิดใช้งานระบบ PTDMS สำหรับบุคลากร',
    category: 'ระบบงาน',
    dateLabel: '12 มิ.ย. 2569',
    description: 'เข้าสู่ระบบเพื่อจัดการข้อมูลฝึกอบรมและข้อมูลพัฒนาบุคลากร',
  },
  {
    title: 'หนังสือประชาสัมพันธ์และเอกสารเผยแพร่ล่าสุด',
    category: 'เอกสาร',
    dateLabel: '10 มิ.ย. 2569',
    description: 'ดาวน์โหลดเอกสารสำคัญที่เกี่ยวข้องกับงานยุทธศาสตร์และแผนงาน',
  },
];

export const homeFaqItems: HomeFaqItem[] = [
  {
    question: 'ผู้ใช้งานเข้าสู่ระบบได้จากที่ไหน',
    answer: 'กดปุ่มเข้าสู่ระบบ PTDMS ที่ส่วนบนของหน้า Home หรือเมนูด้านบน',
  },
  {
    question: 'ใครสามารถแก้ไขป้ายประชาสัมพันธ์ได้',
    answer: 'กำหนดให้ SuperAdmin และ Admin จัดการผ่านโมดูล Site Manager ในระยะถัดไป',
  },
  {
    question: 'เอกสารในหน้า Home จะจัดการอย่างไร',
    answer: 'แยกเป็นหมวดหมู่ เช่น แผนระดับต่าง ๆ แนวทางประจำปี และนโยบายผู้บริหาร เพื่อค้นหาได้ง่าย',
  },
];

export const homeBrandHighlights = [
  { label: 'เชื่อมโยงทุกแผนสู่การปฏิบัติ', icon: Goal },
  { label: 'บูรณาการการทำงานทุกระดับ', icon: UsersRound },
  { label: 'มุ่งสู่ระบบสุขภาพที่มั่นคง', icon: ShieldCheck },
  { label: 'เพื่อคนไทยแข็งแรงทุกช่วงวัย', icon: Megaphone },
];
