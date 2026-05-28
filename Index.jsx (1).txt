import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// DESIGN TOKENS & THEME
// ============================================================
const THEME = {
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  goldDark: "#8B6914",
  emerald: "#1A6B47",
  emeraldLight: "#2D9E6B",
  emeraldDark: "#0D3D27",
  cream: "#FAF7F0",
  ink: "#1A1208",
  inkMuted: "#4A3F2A",
  parchment: "#F2EAD8",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;900&family=Cairo:wght@300;400;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --gold: #C9A84C;
    --gold-light: #E8C97A;
    --gold-dark: #8B6914;
    --emerald: #1A6B47;
    --emerald-light: #2D9E6B;
    --emerald-dark: #0D3D27;
    --cream: #FAF7F0;
    --ink: #1A1208;
    --ink-muted: #4A3F2A;
    --parchment: #F2EAD8;
    --shadow-sm: 0 2px 8px rgba(26,18,8,0.08);
    --shadow-md: 0 4px 20px rgba(26,18,8,0.12);
    --shadow-lg: 0 8px 40px rgba(26,18,8,0.16);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-xl: 32px;
  }

  html { font-size: 16px; scroll-behavior: smooth; }
  
  body {
    font-family: 'Cairo', 'Tajawal', sans-serif;
    background: var(--cream);
    color: var(--ink);
    direction: rtl;
    min-height: 100vh;
    overflow-x: hidden;
  }

  h1,h2,h3,h4,h5 {
    font-family: 'Amiri', serif;
    line-height: 1.3;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--parchment); }
  ::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 3px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px) rotate(0deg); }
    33%  { transform: translateY(-12px) rotate(3deg); }
    66%  { transform: translateY(-6px) rotate(-2deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.92); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
  @keyframes calligraphy {
    0%   { stroke-dashoffset: 1000; opacity: 0.3; }
    100% { stroke-dashoffset: 0;    opacity: 1; }
  }

  .animate-fade-up  { animation: fadeUp  0.6s ease forwards; }
  .animate-fade-in  { animation: fadeIn  0.4s ease forwards; }
  .animate-scale-in { animation: scaleIn 0.3s ease forwards; }
  .animate-float    { animation: float   4s ease-in-out infinite; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 28px; border-radius: var(--radius-md);
    font-family: 'Cairo', sans-serif; font-size: 15px; font-weight: 600;
    cursor: pointer; border: none; outline: none; transition: all 0.2s ease;
    text-decoration: none; white-space: nowrap;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--gold), var(--gold-dark));
    color: var(--ink); box-shadow: 0 4px 16px rgba(201,168,76,0.35);
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(201,168,76,0.45); }
  .btn-primary:active { transform: translateY(0); }
  .btn-emerald {
    background: linear-gradient(135deg, var(--emerald-light), var(--emerald-dark));
    color: #fff; box-shadow: 0 4px 16px rgba(26,107,71,0.3);
  }
  .btn-emerald:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(26,107,71,0.4); }
  .btn-outline {
    background: transparent; border: 1.5px solid var(--gold);
    color: var(--gold);
  }
  .btn-outline:hover { background: var(--gold); color: var(--ink); }
  .btn-ghost {
    background: rgba(201,168,76,0.1); color: var(--gold-dark);
  }
  .btn-ghost:hover { background: rgba(201,168,76,0.2); }
  .btn-danger { background: #DC2626; color: #fff; }
  .btn-danger:hover { background: #B91C1C; }
  .btn-sm { padding: 8px 18px; font-size: 13px; }
  .btn-lg { padding: 16px 40px; font-size: 17px; border-radius: var(--radius-lg); }

  .card {
    background: #fff; border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm); border: 1px solid rgba(201,168,76,0.15);
    overflow: hidden; transition: all 0.25s ease;
  }
  .card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
  .card-body { padding: 24px; }

  .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .input-label { font-size: 14px; font-weight: 600; color: var(--ink-muted); }
  .input-field {
    padding: 12px 16px; border-radius: var(--radius-sm);
    border: 1.5px solid rgba(201,168,76,0.3); background: #fff;
    font-family: 'Cairo', sans-serif; font-size: 15px; color: var(--ink);
    transition: border-color 0.2s; outline: none; direction: rtl;
  }
  .input-field:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
  .input-field::placeholder { color: #aaa; }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  }
  .badge-gold { background: rgba(201,168,76,0.15); color: var(--gold-dark); }
  .badge-emerald { background: rgba(26,107,71,0.12); color: var(--emerald); }
  .badge-red { background: rgba(220,38,38,0.1); color: #DC2626; }
  .badge-blue { background: rgba(59,130,246,0.1); color: #2563EB; }

  .navbar {
    position: fixed; top: 0; right: 0; left: 0; z-index: 100;
    height: 64px; display: flex; align-items: center;
    padding: 0 24px; gap: 16px;
    background: rgba(250,247,240,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(201,168,76,0.2);
    box-shadow: 0 2px 12px rgba(26,18,8,0.06);
  }
  .nav-brand {
    font-family: 'Amiri', serif; font-size: 16px; font-weight: 700;
    color: var(--emerald-dark); text-decoration: none; flex: 1;
    line-height: 1.2;
  }
  .nav-links { display: flex; align-items: center; gap: 8px; }
  .nav-link {
    padding: 8px 14px; border-radius: var(--radius-sm);
    font-size: 14px; font-weight: 500; color: var(--ink-muted);
    cursor: pointer; transition: all 0.2s;
    background: none; border: none; font-family: 'Cairo', sans-serif;
  }
  .nav-link:hover { background: rgba(201,168,76,0.1); color: var(--gold-dark); }
  .nav-link.active { background: rgba(201,168,76,0.15); color: var(--gold-dark); font-weight: 600; }

  .sidebar {
    width: 260px; min-height: 100vh; background: var(--emerald-dark);
    padding: 24px 0; display: flex; flex-direction: column; gap: 4px;
    position: fixed; top: 0; right: 0; z-index: 50;
  }
  .sidebar-brand {
    padding: 0 20px 20px; border-bottom: 1px solid rgba(201,168,76,0.2);
    font-family: 'Amiri', serif; color: var(--gold-light); font-size: 15px;
    font-weight: 700; line-height: 1.3; margin-bottom: 8px;
  }
  .sidebar-link {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 20px; color: rgba(250,247,240,0.75);
    cursor: pointer; transition: all 0.2s; border: none;
    background: none; font-family: 'Cairo', sans-serif; font-size: 14px;
    width: 100%; text-align: right; border-radius: 0;
  }
  .sidebar-link:hover { background: rgba(201,168,76,0.12); color: var(--gold-light); }
  .sidebar-link.active { background: rgba(201,168,76,0.2); color: var(--gold); border-right: 3px solid var(--gold); }
  .sidebar-section { padding: 16px 20px 4px; font-size: 11px; font-weight: 600; color: rgba(250,247,240,0.35); letter-spacing: 1px; text-transform: uppercase; }

  .dash-layout { display: flex; min-height: 100vh; }
  .dash-main { flex: 1; margin-right: 260px; padding: 80px 32px 40px; }
  .dash-header { margin-bottom: 28px; }
  .dash-title { font-size: 28px; color: var(--emerald-dark); margin-bottom: 4px; }
  .dash-subtitle { color: var(--ink-muted); font-size: 15px; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: #fff; border-radius: var(--radius-md);
    padding: 20px; border: 1px solid rgba(201,168,76,0.15);
    box-shadow: var(--shadow-sm);
  }
  .stat-icon { font-size: 28px; margin-bottom: 8px; }
  .stat-value { font-size: 28px; font-weight: 700; color: var(--emerald-dark); font-family: 'Cairo', sans-serif; }
  .stat-label { font-size: 13px; color: var(--ink-muted); margin-top: 2px; }

  .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 20px; }
  .course-card {
    background: #fff; border-radius: var(--radius-lg);
    border: 1px solid rgba(201,168,76,0.15); overflow: hidden;
    box-shadow: var(--shadow-sm); transition: all 0.3s ease; cursor: pointer;
  }
  .course-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
  .course-thumb {
    width: 100%; height: 160px; object-fit: cover;
    background: linear-gradient(135deg, var(--emerald-dark), var(--emerald));
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; color: rgba(201,168,76,0.5);
    position: relative; overflow: hidden;
  }
  .course-thumb-pattern {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.08'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  .course-info { padding: 16px; }
  .course-title { font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 6px; font-family: 'Cairo', sans-serif; }
  .course-desc { font-size: 13px; color: var(--ink-muted); line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .course-meta { display: flex; align-items: center; justify-content: space-between; }
  .course-price { font-size: 18px; font-weight: 700; color: var(--gold-dark); font-family: 'Cairo', sans-serif; }
  .course-lectures { font-size: 12px; color: var(--ink-muted); }
  
  .progress-bar { height: 4px; background: rgba(201,168,76,0.15); border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--emerald-light)); border-radius: 2px; transition: width 0.6s ease; }

  .locked-overlay {
    position: absolute; inset: 0; background: rgba(26,18,8,0.6);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(2px);
  }
  .lock-icon { font-size: 36px; }

  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(26,18,8,0.5);
    z-index: 200; display: flex; align-items: center; justify-content: center;
    padding: 20px; backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  .modal {
    background: #fff; border-radius: var(--radius-xl);
    max-width: 520px; width: 100%;
    max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(26,18,8,0.25);
    animation: scaleIn 0.25s ease;
  }
  .modal-header {
    padding: 24px 24px 0; display: flex;
    align-items: center; justify-content: space-between;
  }
  .modal-title { font-size: 22px; color: var(--emerald-dark); }
  .modal-body { padding: 20px 24px 24px; }
  .modal-close {
    width: 32px; height: 32px; border-radius: 50%; border: none;
    background: rgba(26,18,8,0.06); cursor: pointer; font-size: 18px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .modal-close:hover { background: rgba(220,38,38,0.1); color: #DC2626; }

  .table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .table th { padding: 12px 16px; text-align: right; background: var(--parchment); color: var(--ink-muted); font-weight: 600; font-size: 12px; letter-spacing: 0.5px; }
  .table td { padding: 13px 16px; border-bottom: 1px solid rgba(201,168,76,0.1); vertical-align: middle; }
  .table tr:hover td { background: rgba(250,247,240,0.7); }
  .table-container { background: #fff; border-radius: var(--radius-lg); border: 1px solid rgba(201,168,76,0.15); overflow: hidden; box-shadow: var(--shadow-sm); }

  .quiz-option {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px; border-radius: var(--radius-md);
    border: 1.5px solid rgba(201,168,76,0.2); margin-bottom: 10px;
    cursor: pointer; transition: all 0.2s; background: #fff;
    font-size: 15px;
  }
  .quiz-option:hover { border-color: var(--gold); background: rgba(201,168,76,0.04); }
  .quiz-option.selected { border-color: var(--gold); background: rgba(201,168,76,0.08); }
  .quiz-option.correct { border-color: #16A34A; background: rgba(22,163,74,0.08); color: #16A34A; }
  .quiz-option.wrong   { border-color: #DC2626; background: rgba(220,38,38,0.06); color: #DC2626; }
  .quiz-circle {
    width: 28px; height: 28px; border-radius: 50%; border: 2px solid currentColor;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; flex-shrink: 0;
  }

  .toast {
    position: fixed; bottom: 24px; left: 24px; z-index: 999;
    padding: 14px 22px; border-radius: var(--radius-md);
    font-size: 14px; font-weight: 500; font-family: 'Cairo', sans-serif;
    box-shadow: var(--shadow-lg); animation: slideIn 0.3s ease;
    max-width: 320px; display: flex; align-items: center; gap: 8px;
  }
  .toast-success { background: #16A34A; color: #fff; }
  .toast-error   { background: #DC2626; color: #fff; }
  .toast-info    { background: var(--emerald-dark); color: #fff; }

  .search-box {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-radius: 50px;
    border: 1.5px solid rgba(201,168,76,0.25); background: #fff;
    box-shadow: var(--shadow-sm); width: 100%; max-width: 360px;
  }
  .search-input {
    flex: 1; border: none; outline: none; background: none;
    font-family: 'Cairo', sans-serif; font-size: 14px; direction: rtl;
  }

  .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; inset: 0; cursor: pointer;
    border-radius: 24px; background: #ddd; transition: 0.3s;
  }
  .toggle-slider::before {
    content: ''; position: absolute; height: 18px; width: 18px;
    right: 3px; bottom: 3px; border-radius: 50%;
    background: #fff; transition: 0.3s;
  }
  .toggle input:checked + .toggle-slider { background: var(--emerald-light); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(-20px); }

  .video-player {
    background: #111; border-radius: var(--radius-lg); overflow: hidden;
    aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center;
    position: relative; width: 100%;
  }
  .play-btn {
    width: 64px; height: 64px; border-radius: 50%;
    background: rgba(201,168,76,0.9); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; color: var(--ink); transition: all 0.2s;
  }
  .play-btn:hover { transform: scale(1.1); background: var(--gold); }

  .arabic-floaters {
    position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  }
  .arabic-letter {
    position: absolute; font-family: 'Amiri', serif;
    color: rgba(201,168,76,0.12); font-size: 60px; user-select: none;
    animation: float 6s ease-in-out infinite;
  }

  .tabs { display: flex; gap: 4px; background: var(--parchment); padding: 4px; border-radius: var(--radius-md); margin-bottom: 20px; }
  .tab {
    flex: 1; padding: 10px; border-radius: var(--radius-sm);
    border: none; background: none; cursor: pointer;
    font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 500;
    color: var(--ink-muted); transition: all 0.2s;
  }
  .tab.active { background: #fff; color: var(--emerald-dark); box-shadow: var(--shadow-sm); font-weight: 600; }

  .upload-zone {
    border: 2px dashed rgba(201,168,76,0.4); border-radius: var(--radius-md);
    padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s;
    background: rgba(201,168,76,0.03);
  }
  .upload-zone:hover { border-color: var(--gold); background: rgba(201,168,76,0.06); }

  @media (max-width: 768px) {
    .sidebar { width: 100%; min-height: auto; position: relative; top: 0; }
    .dash-layout { flex-direction: column; }
    .dash-main { margin-right: 0; padding: 80px 16px 40px; }
    .navbar { padding: 0 16px; }
    .nav-brand { font-size: 13px; }
    .courses-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2,1fr); }
  }

  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .w-full { width: 100%; }
  .text-center { text-align: center; }
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-3 { margin-bottom: 12px; }
  .mb-4 { margin-bottom: 16px; }
  .mb-6 { margin-bottom: 24px; }
  .mt-4 { margin-top: 16px; }
  .mt-6 { margin-top: 24px; }
  .p-4 { padding: 16px; }
  .text-sm { font-size: 13px; }
  .text-xs { font-size: 12px; }
  .font-bold { font-weight: 700; }
  .text-muted { color: var(--ink-muted); }
  .text-gold { color: var(--gold-dark); }
  .text-emerald { color: var(--emerald); }
  .text-danger { color: #DC2626; }
  .divider { height: 1px; background: rgba(201,168,76,0.15); margin: 16px 0; }
  .section-title { font-size: 22px; color: var(--emerald-dark); margin-bottom: 4px; font-family: 'Amiri', serif; }
  .section-sub { font-size: 14px; color: var(--ink-muted); margin-bottom: 20px; }
  .spinner { width: 36px; height: 36px; border: 3px solid rgba(201,168,76,0.2); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; }
  .empty-state { text-align: center; padding: 60px 20px; color: var(--ink-muted); }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
    border-radius: 20px; font-size: 12px; background: var(--parchment);
    color: var(--ink-muted); cursor: pointer; border: 1px solid rgba(201,168,76,0.2);
    transition: all 0.2s;
  }
  .chip.active, .chip:hover { background: var(--gold); color: var(--ink); border-color: var(--gold); }
  .ornament { color: var(--gold); font-family: 'Amiri', serif; font-size: 20px; }

  /* QUIZ BUILDER */
  .quiz-builder-option {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-radius: var(--radius-sm);
    border: 1.5px solid rgba(201,168,76,0.2); margin-bottom: 8px;
    background: #fff; transition: border-color 0.2s;
  }
  .quiz-builder-option.is-correct { border-color: #16A34A; background: rgba(22,163,74,0.05); }
`;

// ============================================================
// SEED DATA — clean, only real accounts
// ============================================================
const INITIAL_USERS = [
  {
    id: 1,
    name: "مستر مصطفى",
    phone: "01005170607",
    password: "mostafa5132",
    role: "admin",
    avatar: "م",
    joinedAt: "2024-01-01",
  },
  {
    id: 2,
    name: "أنس",
    phone: "01092828464",
    password: "anas5132",
    role: "owner",
    avatar: "أ",
    joinedAt: "2024-01-01",
  },
];

const INITIAL_COURSES = [];
const INITIAL_LECTURES = [];
const INITIAL_PAYMENTS = [];
const INITIAL_COUPONS = [];
const INITIAL_PROGRESS = {};

const LANDING_CONTENT = {
  heroTitle: "اكاديمية مستر مصطفى",
  heroSubtitle: "لتدريس اللغة العربية",
  heroDesc: "تعلّم العربية بأسلوب عصري وممتع مع أفضل المناهج التفاعلية على يد نخبة من الأساتذة المتخصصين",
  heroImage: "",
  teacherName: "مستر مصطفى",
  teacherTitle: "أستاذ متخصص في اللغة العربية",
  teacherBio: "خبرة تزيد عن ١٥ عاماً في تدريس اللغة العربية لجميع المراحل الدراسية. حاصل على درجة الماجستير في اللغة العربية وآدابها، وصاحب أسلوب مبتكر في شرح القواعد والمفردات.",
  teacherStats: [{ label: "سنوات الخبرة", value: "١٥+" }, { label: "طالب تخرج", value: "٥٠٠٠+" }, { label: "دورة معتمدة", value: "٢٠" }],
  features: [
    { icon: "🎯", title: "محتوى متكامل", desc: "دروس شاملة تغطي كل مستويات اللغة العربية" },
    { icon: "📱", title: "تعلّم في أي وقت", desc: "وصول غير محدود من أي جهاز في أي مكان" },
    { icon: "🏆", title: "شهادات معتمدة", desc: "احصل على شهادة إتمام معتمدة لكل دورة" },
    { icon: "💬", title: "دعم مستمر", desc: "تواصل مباشر مع المعلم والمجتمع التعليمي" },
  ]
};

// ============================================================
// STORAGE LAYER
// ============================================================
const useStore = () => {
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_users") || JSON.stringify(INITIAL_USERS)); } catch { return INITIAL_USERS; }
  });
  const [courses, setCourses] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_courses") || JSON.stringify(INITIAL_COURSES)); } catch { return INITIAL_COURSES; }
  });
  const [lectures, setLectures] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_lectures") || JSON.stringify(INITIAL_LECTURES)); } catch { return INITIAL_LECTURES; }
  });
  const [payments, setPayments] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_payments") || JSON.stringify(INITIAL_PAYMENTS)); } catch { return INITIAL_PAYMENTS; }
  });
  const [coupons, setCoupons] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_coupons") || JSON.stringify(INITIAL_COUPONS)); } catch { return INITIAL_COUPONS; }
  });
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_progress") || JSON.stringify(INITIAL_PROGRESS)); } catch { return INITIAL_PROGRESS; }
  });
  const [landingContent, setLandingContent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_landing") || JSON.stringify(LANDING_CONTENT)); } catch { return LANDING_CONTENT; }
  });

  const persist = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };

  const updateUsers    = (v) => { const n = typeof v==="function"?v(users):v;    setUsers(n);    persist("aa_users",n); };
  const updateCourses  = (v) => { const n = typeof v==="function"?v(courses):v;  setCourses(n);  persist("aa_courses",n); };
  const updateLectures = (v) => { const n = typeof v==="function"?v(lectures):v; setLectures(n); persist("aa_lectures",n); };
  const updatePayments = (v) => { const n = typeof v==="function"?v(payments):v; setPayments(n); persist("aa_payments",n); };
  const updateCoupons  = (v) => { const n = typeof v==="function"?v(coupons):v;  setCoupons(n);  persist("aa_coupons",n); };
  const updateProgress = (v) => { const n = typeof v==="function"?v(progress):v; setProgress(n); persist("aa_progress",n); };
  const updateLanding  = (v) => { const n = typeof v==="function"?v(landingContent):v; setLandingContent(n); persist("aa_landing",n); };

  return { users, courses, lectures, payments, coupons, progress, landingContent, updateUsers, updateCourses, updateLectures, updatePayments, updateCoupons, updateProgress, updateLanding };
};

// ============================================================
// AUTH HOOK — phone-based
// ============================================================
const useAuth = (store) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa_currentUser")); } catch { return null; }
  });

  const login = (phone, password) => {
    const trimmedPhone = (phone || "").trim();
    const u = store.users.find(u => u.phone === trimmedPhone && u.password === password);
    if (!u) return { success: false, error: "رقم الهاتف أو كلمة المرور غير صحيحة" };
    localStorage.setItem("aa_currentUser", JSON.stringify(u));
    setCurrentUser(u);
    return { success: true, user: u };
  };

  const register = (name, phone, password) => {
    const trimmedPhone = (phone || "").trim();
    if (!trimmedPhone) return { success: false, error: "رقم الهاتف مطلوب" };
    if (store.users.find(u => u.phone === trimmedPhone)) return { success: false, error: "رقم الهاتف مسجل بالفعل" };
    const newUser = {
      id: Date.now(),
      name: name || "مستخدم جديد",
      phone: trimmedPhone,
      password,
      role: "student",
      avatar: (name || "م").charAt(0),
      joinedAt: new Date().toISOString().split("T")[0],
    };
    store.updateUsers(prev => [...prev, newUser]);
    localStorage.setItem("aa_currentUser", JSON.stringify(newUser));
    setCurrentUser(newUser);
    return { success: true, user: newUser };
  };

  const logout = () => { localStorage.removeItem("aa_currentUser"); setCurrentUser(null); };

  const refreshUser = useCallback(() => {
    if (!currentUser) return;
    const updated = store.users.find(u => u.id === currentUser.id);
    if (updated) { localStorage.setItem("aa_currentUser", JSON.stringify(updated)); setCurrentUser(updated); }
  }, [currentUser, store.users]);

  return { currentUser, login, register, logout, refreshUser };
};

// ============================================================
// TOAST
// ============================================================
const Toast = ({ toast, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  if (!toast) return null;
  const cls = toast.type==="success"?"toast-success":toast.type==="error"?"toast-error":"toast-info";
  const icon = toast.type==="success"?"✅":toast.type==="error"?"❌":"ℹ️";
  return <div className={`toast ${cls}`}>{icon} {toast.message}</div>;
};

// ============================================================
// NAVBAR
// ============================================================
const Navbar = ({ page, setPage, currentUser, onLogout }) => (
  <nav className="navbar">
    <span className="nav-brand">اكاديمية مستر مصطفى<br/>لتدريس اللغة العربية</span>
    <div className="nav-links">
      {!currentUser ? (
        <>
          <button className="nav-link" onClick={() => setPage("login")}>تسجيل الدخول</button>
          <button className="btn btn-primary btn-sm" onClick={() => setPage("register")}>إنشاء حساب</button>
        </>
      ) : (
        <>
          <button className="nav-link" onClick={() => setPage("dashboard")}>
            <span style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#1A6B47)",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{currentUser.avatar}</span>
            &nbsp;{(currentUser.name||"").split(" ")[0]}
          </button>
          {(currentUser.role==="admin"||currentUser.role==="owner") && (
            <button className="nav-link" onClick={() => setPage("admin")}>لوحة الإدارة</button>
          )}
          {currentUser.role==="owner" && (
            <button className="nav-link" onClick={() => setPage("owner")}>لوحة المالك</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>خروج</button>
        </>
      )}
    </div>
  </nav>
);

// ============================================================
// LANDING PAGE
// ============================================================
const LandingPage = ({ setPage, content }) => {
  const letters = ["ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س"];
  const positions = [{top:"10%",right:"5%"},{top:"20%",left:"8%"},{top:"50%",right:"3%"},{top:"70%",left:"5%"},{top:"85%",right:"10%"},{top:"35%",left:"2%"},{top:"60%",right:"15%"},{top:"15%",left:"20%"},{top:"75%",right:"25%"},{top:"40%",right:"30%"},{top:"90%",left:"15%"},{top:"25%",right:"40%"}];

  const heroStyle = {
    minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    position:"relative", overflow:"hidden", textAlign:"center", padding:"80px 24px 60px"
  };

  if (content.heroImage) {
    heroStyle.backgroundImage = `url(${content.heroImage})`;
    heroStyle.backgroundSize = "cover";
    heroStyle.backgroundPosition = "center";
  } else {
    heroStyle.background = "linear-gradient(160deg, #0D3D27 0%, #1A6B47 40%, #0D3D27 100%)";
  }

  return (
    <div style={{minHeight:"100vh"}}>
      {/* HERO */}
      <section style={heroStyle}>
        {/* Dark overlay when custom image is set */}
        {content.heroImage && (
          <div style={{position:"absolute",inset:0,background:"rgba(13,61,39,0.7)",zIndex:0}}/>
        )}
        <div style={{position:"absolute",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23C9A84C' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")"}}/>

        <div className="arabic-floaters">
          {letters.map((l,i) => (
            <span key={i} className="arabic-letter" style={{...positions[i],animationDelay:`${i*0.5}s`,fontSize:[60,48,72,52,64,44,56,68,50,58,46,62][i]}}>{l}</span>
          ))}
        </div>

        <div style={{position:"absolute",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.1)"}}/>
        <div style={{position:"absolute",bottom:-150,left:-100,width:500,height:500,borderRadius:"50%",background:"rgba(201,168,76,0.04)",border:"1px solid rgba(201,168,76,0.08)"}}/>

        <div style={{position:"relative",zIndex:2}} className="animate-fade-up">
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(201,168,76,0.15)",border:"1px solid rgba(201,168,76,0.3)",borderRadius:50,padding:"8px 20px",marginBottom:24}}>
            <span style={{fontSize:16}}>🌟</span>
            <span style={{color:"#E8C97A",fontSize:14,fontFamily:"Cairo"}}>المنصة التعليمية الأولى للغة العربية</span>
          </div>

          <div className="ornament" style={{fontSize:28,marginBottom:8}}>﷽</div>
          <h1 style={{fontFamily:"Amiri,serif",color:"#E8C97A",fontSize:"clamp(32px,6vw,64px)",marginBottom:8,lineHeight:1.2}}>
            {content.heroTitle}
          </h1>
          <h2 style={{fontFamily:"Amiri,serif",color:"rgba(232,201,122,0.75)",fontSize:"clamp(20px,4vw,36px)",marginBottom:24,fontWeight:400}}>
            {content.heroSubtitle}
          </h2>

          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:24}}>
            <div style={{height:1,width:80,background:"linear-gradient(to right, transparent, rgba(201,168,76,0.5))"}}/>
            <span style={{color:"rgba(201,168,76,0.7)",fontSize:20,fontFamily:"Amiri"}}>✦</span>
            <div style={{height:1,width:80,background:"linear-gradient(to left, transparent, rgba(201,168,76,0.5))"}}/>
          </div>

          <p style={{color:"rgba(250,247,240,0.75)",fontSize:"clamp(15px,2.5vw,18px)",maxWidth:560,margin:"0 auto 40px",lineHeight:1.8,fontFamily:"Cairo"}}>
            {content.heroDesc}
          </p>

          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button className="btn btn-primary btn-lg" onClick={() => setPage("register")}>ابدأ رحلتك الآن 🚀</button>
            <button className="btn btn-lg" style={{border:"1.5px solid rgba(201,168,76,0.4)",color:"#E8C97A",background:"rgba(201,168,76,0.08)"}} onClick={() => setPage("login")}>تسجيل الدخول</button>
          </div>

          <div style={{display:"flex",gap:40,justifyContent:"center",marginTop:56,flexWrap:"wrap"}}>
            {[{n:"٥٠٠٠+",l:"طالب مسجل"},{n:"٢٠",l:"دورة متاحة"},{n:"١٥+",l:"سنة خبرة"},{n:"٩٨٪",l:"نسبة الرضا"}].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontFamily:"Amiri,serif",fontSize:36,color:"#C9A84C",fontWeight:700}}>{s.n}</div>
                <div style={{color:"rgba(250,247,240,0.6)",fontSize:13,fontFamily:"Cairo"}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <span style={{color:"rgba(201,168,76,0.5)",fontSize:12,fontFamily:"Cairo"}}>اكتشف المزيد</span>
          <div style={{width:1,height:40,background:"linear-gradient(to bottom, rgba(201,168,76,0.5), transparent)",animation:"pulse 2s ease infinite"}}/>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:"80px 24px",background:THEME.cream}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <h2 style={{fontFamily:"Amiri,serif",fontSize:40,color:THEME.emeraldDark,marginBottom:12}}>لماذا تختار اكاديميتنا؟</h2>
            <p style={{color:THEME.inkMuted,fontSize:17,fontFamily:"Cairo"}}>نقدم لك تجربة تعليمية استثنائية تجمع بين الأصالة والحداثة</p>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:16}}>
              <div style={{height:2,width:60,background:THEME.gold,borderRadius:2}}/>
              <span style={{color:THEME.gold,fontFamily:"Amiri",fontSize:24}}>✦</span>
              <div style={{height:2,width:60,background:THEME.gold,borderRadius:2}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:24}}>
            {(content.features||[]).map((f,i)=>(
              <div key={i} className="card" style={{padding:28,textAlign:"center",animationDelay:`${i*0.1}s`}}>
                <div style={{fontSize:44,marginBottom:16}}>{f.icon}</div>
                <h3 style={{fontFamily:"Cairo,sans-serif",fontSize:18,color:THEME.emeraldDark,marginBottom:8,fontWeight:700}}>{f.title}</h3>
                <p style={{color:THEME.inkMuted,fontSize:14,lineHeight:1.7}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEACHER */}
      <section style={{padding:"80px 24px",background:THEME.parchment}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"center"}}>
            <div>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(201,168,76,0.15)",borderRadius:50,padding:"6px 16px",marginBottom:20}}>
                <span style={{color:THEME.goldDark,fontSize:13,fontFamily:"Cairo",fontWeight:600}}>👨‍🏫 كلمة الأستاذ</span>
              </div>
              <h2 style={{fontFamily:"Amiri,serif",fontSize:38,color:THEME.emeraldDark,marginBottom:8}}>{content.teacherName}</h2>
              <p style={{color:THEME.gold,fontFamily:"Cairo",fontSize:16,fontWeight:600,marginBottom:20}}>{content.teacherTitle}</p>
              <p style={{color:THEME.inkMuted,fontSize:16,lineHeight:1.9,marginBottom:28,fontFamily:"Cairo"}}>{content.teacherBio}</p>
              <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                {(content.teacherStats||[]).map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"Amiri,serif",fontSize:32,color:THEME.gold,fontWeight:700}}>{s.value}</div>
                    <div style={{color:THEME.inkMuted,fontSize:13,fontFamily:"Cairo"}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:260,height:260,borderRadius:"50%",background:"linear-gradient(135deg, #0D3D27, #2D9E6B)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",boxShadow:"0 20px 60px rgba(26,107,71,0.3)"}}>
                <div style={{position:"absolute",inset:-12,borderRadius:"50%",border:"2px dashed rgba(201,168,76,0.4)",animation:"spin 20s linear infinite"}}/>
                <div style={{position:"absolute",inset:-24,borderRadius:"50%",border:"1px solid rgba(201,168,76,0.15)"}}/>
                <span style={{fontFamily:"Amiri,serif",fontSize:100,color:"rgba(201,168,76,0.6)"}}>م</span>
                <div style={{position:"absolute",bottom:16,right:16,background:THEME.gold,borderRadius:"50%",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⭐</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:"80px 24px",background:"linear-gradient(135deg, #0D3D27 0%, #1A6B47 100%)",textAlign:"center"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <h2 style={{fontFamily:"Amiri,serif",color:"#E8C97A",fontSize:42,marginBottom:16}}>ابدأ رحلتك التعليمية اليوم</h2>
          <p style={{color:"rgba(250,247,240,0.75)",fontSize:17,marginBottom:36,fontFamily:"Cairo",lineHeight:1.7}}>انضم إلى آلاف الطلاب الذين غيّروا مستواهم في اللغة العربية مع اكاديمية مستر مصطفى</p>
          <button className="btn btn-primary btn-lg" onClick={() => setPage("register")}>سجّل مجاناً الآن ✨</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:"#0D3D27",padding:"32px 24px",textAlign:"center"}}>
        <p style={{fontFamily:"Amiri,serif",color:"rgba(201,168,76,0.7)",fontSize:14}}>
          © ٢٠٢٤ اكاديمية مستر مصطفى لتدريس اللغة العربية — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
};

// ============================================================
// AUTH PAGE — phone-based
// ============================================================
const AuthPage = ({ mode, onLogin, onRegister, setPage }) => {
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const res = isLogin
      ? onLogin(form.phone, form.password)
      : onRegister(form.name, form.phone, form.password);
    if (!res.success) { setError(res.error); setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg, #0D3D27 0%, #1A6B47 60%, #C9A84C 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 20px"}}>
      <div style={{position:"fixed",top:-120,right:-120,width:400,height:400,borderRadius:"50%",border:"1px solid rgba(201,168,76,0.2)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-80,left:-80,width:300,height:300,borderRadius:"50%",border:"1px solid rgba(201,168,76,0.15)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:420}} className="animate-scale-in">
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#8B6914)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 24px rgba(201,168,76,0.4)"}}>
            <span style={{fontSize:32,fontFamily:"Amiri"}}>م</span>
          </div>
          <h1 style={{fontFamily:"Amiri,serif",color:"#FAF7F0",fontSize:22,lineHeight:1.3}}>اكاديمية مستر مصطفى<br/>لتدريس اللغة العربية</h1>
        </div>

        <div style={{background:"#fff",borderRadius:24,padding:32,boxShadow:"0 20px 60px rgba(13,61,39,0.4)"}}>
          <h2 style={{fontFamily:"Amiri,serif",fontSize:26,color:THEME.emeraldDark,textAlign:"center",marginBottom:6}}>
            {isLogin ? "مرحباً بعودتك 👋" : "انضم إلينا اليوم ✨"}
          </h2>
          <p style={{textAlign:"center",color:THEME.inkMuted,fontSize:14,marginBottom:24,fontFamily:"Cairo"}}>
            {isLogin ? "أدخل بياناتك للدخول إلى حسابك" : "أنشئ حساباً جديداً مجاناً"}
          </p>

          {error && (
            <div style={{background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#DC2626",fontSize:14,fontFamily:"Cairo"}}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handle}>
            {!isLogin && (
              <div className="input-group">
                <label className="input-label">الاسم الكامل</label>
                <input className="input-field" placeholder="أدخل اسمك الكامل" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">رقم الهاتف</label>
              <input
                className="input-field"
                type="tel"
                placeholder="مثال: 01005170607"
                value={form.phone}
                onChange={e=>setForm({...form,phone:e.target.value})}
                required
                style={{direction:"ltr",textAlign:"right"}}
              />
            </div>
            <div className="input-group">
              <label className="input-label">كلمة المرور</label>
              <input className="input-field" type="password" placeholder="أدخل كلمة المرور" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
            </div>

            <button className="btn btn-emerald w-full mt-4" type="submit" disabled={loading} style={{padding:"14px",width:"100%"}}>
              {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> جاري التحميل...</> : isLogin ? "🔐 تسجيل الدخول" : "🚀 إنشاء الحساب"}
            </button>
          </form>

          <div className="divider"/>

          <p style={{textAlign:"center",fontSize:14,color:THEME.inkMuted,fontFamily:"Cairo"}}>
            {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
            <button onClick={() => setPage(isLogin?"register":"login")} style={{color:THEME.emerald,fontWeight:700,border:"none",background:"none",cursor:"pointer",fontFamily:"Cairo",fontSize:14}}>
              {isLogin ? "إنشاء حساب جديد" : "تسجيل الدخول"}
            </button>
          </p>

          {isLogin && (
            <div style={{marginTop:16,padding:12,background:THEME.parchment,borderRadius:8,fontSize:12,color:THEME.inkMuted,fontFamily:"Cairo"}}>
              <strong>للدخول:</strong> مالك: 01092828464 / anas5132 | مدير: 01005170607 / mostafa5132
            </div>
          )}
        </div>

        <p style={{textAlign:"center",color:"rgba(250,247,240,0.5)",fontSize:13,marginTop:24,fontFamily:"Cairo"}}>
          بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية
        </p>
      </div>
    </div>
  );
};

// ============================================================
// QUIZ VIEW COMPONENT
// ============================================================
const QuizView = ({ lectureId, quizData, onDone, showToast, saveQuizScore }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return <div className="empty-state"><p>لا يوجد اختبار لهذا الدرس</p></div>;
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < quizData.questions.length) {
      showToast("يرجى الإجابة على جميع الأسئلة", "error");
      return;
    }
    const score = quizData.questions.filter(q => answers[q.id] === q.correct).length;
    const pct = Math.round(score / quizData.questions.length * 100);
    if (saveQuizScore) saveQuizScore(lectureId, pct);
    setSubmitted(true);
  };

  if (submitted) {
    const score = quizData.questions.filter(q => answers[q.id] === q.correct).length;
    const pct = Math.round(score / quizData.questions.length * 100);
    return (
      <div style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:60,marginBottom:16}}>{pct>=70?"🎉":"😅"}</div>
        <h3 style={{fontFamily:"Amiri,serif",fontSize:28,color:THEME.emeraldDark,marginBottom:8}}>نتيجتك: {pct}%</h3>
        <p style={{color:THEME.inkMuted,fontSize:16,marginBottom:24,fontFamily:"Cairo"}}>
          أجبت إجابة صحيحة على {score} من {quizData.questions.length} أسئلة
        </p>
        <div style={{display:"inline-block",padding:"8px 24px",borderRadius:50,background:pct>=70?"rgba(22,163,74,0.1)":"rgba(220,38,38,0.1)",color:pct>=70?"#16A34A":"#DC2626",fontWeight:700,fontSize:18,fontFamily:"Cairo",marginBottom:24}}>
          {pct>=70?"✅ ناجح":"❌ راسب - حاول مجدداً"}
        </div>
        <br/>
        <button className="btn btn-outline" onClick={onDone}>العودة للدرس</button>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{fontFamily:"Amiri,serif",fontSize:22,color:THEME.emeraldDark,marginBottom:4}}>{quizData.title}</h3>
      <p style={{color:THEME.inkMuted,fontSize:14,marginBottom:24,fontFamily:"Cairo"}}>{quizData.questions.length} أسئلة — اختر الإجابة الصحيحة</p>

      {quizData.questions.map((q, qi) => (
        <div key={q.id} style={{marginBottom:28}}>
          <p style={{fontFamily:"Cairo,sans-serif",fontSize:16,fontWeight:600,color:THEME.ink,marginBottom:12}}>
            {qi+1}. {q.text}
          </p>
          {(q.options||[]).map((opt, oi) => (
            <div key={oi} className={`quiz-option ${answers[q.id]===oi?"selected":""}`} onClick={()=>setAnswers({...answers,[q.id]:oi})}>
              <div className="quiz-circle">{["أ","ب","ج","د"][oi]}</div>
              <span style={{fontFamily:"Cairo"}}>{opt}</span>
            </div>
          ))}
        </div>
      ))}

      <button className="btn btn-emerald" onClick={handleSubmit}>📊 تسليم الاختبار</button>
    </div>
  );
};

// ============================================================
// QUIZ BUILDER COMPONENT (Admin/Owner — inline in lecture)
// ============================================================
const QuizBuilder = ({ quiz, onChange }) => {
  const emptyQuestion = () => ({ id: Date.now(), text: "", options: ["", "", "", ""], correct: 0 });

  const questions = quiz?.questions || [];

  const addQuestion = () => {
    onChange({ title: quiz?.title || "اختبار جديد", questions: [...questions, emptyQuestion()] });
  };

  const removeQuestion = (idx) => {
    const updated = questions.filter((_, i) => i !== idx);
    onChange({ ...quiz, questions: updated });
  };

  const updateQuestion = (idx, field, value) => {
    const updated = questions.map((q, i) => i === idx ? { ...q, [field]: value } : q);
    onChange({ ...quiz, questions: updated });
  };

  const updateOption = (qIdx, oIdx, value) => {
    const updated = questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...(q.options || ["","","",""])];
      opts[oIdx] = value;
      return { ...q, options: opts };
    });
    onChange({ ...quiz, questions: updated });
  };

  const setCorrect = (qIdx, oIdx) => {
    const updated = questions.map((q, i) => i === qIdx ? { ...q, correct: oIdx } : q);
    onChange({ ...quiz, questions: updated });
  };

  return (
    <div>
      <div className="input-group">
        <label className="input-label">عنوان الاختبار</label>
        <input
          className="input-field"
          value={quiz?.title || ""}
          placeholder="مثال: اختبار الدرس الأول"
          onChange={e => onChange({ ...quiz, title: e.target.value, questions })}
        />
      </div>

      {questions.map((q, qi) => (
        <div key={q.id} style={{border:"1.5px solid rgba(201,168,76,0.25)",borderRadius:12,padding:16,marginBottom:16,background:"rgba(250,247,240,0.5)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontFamily:"Cairo",fontWeight:700,fontSize:14,color:THEME.emeraldDark}}>السؤال {qi+1}</span>
            <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(qi)}>حذف</button>
          </div>
          <div className="input-group" style={{marginBottom:10}}>
            <input
              className="input-field"
              placeholder="نص السؤال"
              value={q.text}
              onChange={e => updateQuestion(qi, "text", e.target.value)}
            />
          </div>
          <p style={{fontFamily:"Cairo",fontSize:12,color:THEME.inkMuted,marginBottom:8}}>الخيارات (انقر على ✅ لتعيين الإجابة الصحيحة):</p>
          {(q.options || ["","","",""]).map((opt, oi) => (
            <div key={oi} className={`quiz-builder-option${q.correct===oi?" is-correct":""}`}>
              <button
                style={{background:"none",border:"none",cursor:"pointer",fontSize:16,flexShrink:0}}
                onClick={() => setCorrect(qi, oi)}
                title="تعيين كإجابة صحيحة"
              >
                {q.correct===oi ? "✅" : "⭕"}
              </button>
              <input
                className="input-field"
                style={{flex:1,marginBottom:0,border:"none",padding:"4px 8px",background:"transparent"}}
                placeholder={`الخيار ${["أ","ب","ج","د"][oi]}`}
                value={opt}
                onChange={e => updateOption(qi, oi, e.target.value)}
              />
            </div>
          ))}
        </div>
      ))}

      <button className="btn btn-ghost btn-sm" onClick={addQuestion}>+ إضافة سؤال</button>
    </div>
  );
};

// ============================================================
// PAY MODAL
// ============================================================
const PayModal = ({ course, currentUser, store, showToast, onClose }) => {
  const [method, setMethod] = useState("fawry");
  const [code, setCode] = useState("");
  const [paying, setPaying] = useState(false);

  if (!course) return null;

  const handlePay = async () => {
    setPaying(true);
    await new Promise(r => setTimeout(r, 1200));
    if (method === "code") {
      const coupon = store.coupons.find(c => c.code === code.toUpperCase() && c.active);
      if (!coupon) {
        showToast("كود الوصول غير صحيح أو منتهي الصلاحية", "error");
        setPaying(false);
        return;
      }
      if (coupon.uses >= coupon.maxUses) {
        showToast("تم استنفاد هذا الكود بالكامل", "error");
        setPaying(false);
        return;
      }
      store.updateCoupons(prev => prev.map(c => c.code===code.toUpperCase()?{...c,uses:c.uses+1}:c));
    }
    store.updatePayments(prev => [...prev, {
      id: Date.now(),
      userId: currentUser.id,
      courseId: course.id,
      amount: course.price,
      method: method==="fawry"?"Fawry":"كود وصول",
      status: "مكتمل",
      date: new Date().toISOString().split("T")[0],
      ref: `${method.toUpperCase()}-${Date.now()}`
    }]);
    showToast("🎉 تم الدفع بنجاح! الكورس متاح الآن", "success");
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💳 فتح الكورس</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{textAlign:"center",padding:"16px 0",marginBottom:20}}>
            <div style={{fontSize:40,marginBottom:8}}>{course.icon}</div>
            <h4 style={{fontFamily:"Cairo,sans-serif",fontSize:18,color:THEME.emeraldDark,marginBottom:4}}>{course.title}</h4>
            <div style={{fontSize:28,fontWeight:700,color:THEME.goldDark,fontFamily:"Cairo"}}>{course.price} جنيه</div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {[{id:"fawry",label:"💙 Fawry"},{id:"code",label:"🎟️ كود وصول"}].map(m=>(
              <button key={m.id} className={`tab ${method===m.id?"active":""}`} style={{flex:1}} onClick={()=>setMethod(m.id)}>{m.label}</button>
            ))}
          </div>

          {method==="fawry" && (
            <div style={{background:THEME.parchment,borderRadius:12,padding:20,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>💙</div>
              <p style={{fontFamily:"Cairo",fontSize:14,color:THEME.inkMuted,lineHeight:1.7}}>
                يمكنك الدفع عبر Fawry في أي نقطة خدمة أو تطبيق Fawry.<br/>
                <strong>كود الدفع: FAW-MUSTAFA-{course.id}</strong>
              </p>
              <p style={{fontSize:12,color:THEME.inkMuted,marginTop:8,fontFamily:"Cairo"}}>💡 في هذا العرض التوضيحي، الدفع مجاني للتجربة</p>
            </div>
          )}
          {method==="code" && (
            <div className="input-group">
              <label className="input-label">كود الوصول</label>
              <input className="input-field" placeholder="أدخل الكود هنا" value={code} onChange={e=>setCode(e.target.value)} style={{letterSpacing:2,textAlign:"center"}}/>
            </div>
          )}

          <button className="btn btn-emerald w-full mt-4" style={{width:"100%",marginTop:16}} onClick={handlePay} disabled={paying}>
            {paying?"جاري المعالجة...":"✅ تأكيد الدفع وفتح الكورس"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// LECTURE DETAIL VIEW
// ============================================================
const LectureDetailView = ({ lecture, course, currentUser, store, showToast, onBack, markComplete, saveQuizScore }) => {
  const [tab, setTab] = useState("videos");

  if (!lecture || !course) return null;

  const progKey = `${currentUser.id}-${course.id}`;
  const prog = store.progress[progKey] || { completed: [], quizScores: {} };
  const isCompleted = prog.completed.includes(lecture.id);

  // Quiz data comes from the lecture itself (persisted in store)
  const quizData = lecture.quiz || null;
  const hwData = lecture.homework || null;

  const tabs = [
    {id:"videos", label:`📹 الفيديوهات (${(lecture.videos||[]).length})`},
    {id:"pdfs",   label:`📄 الملفات (${(lecture.pdfs||[]).length})`},
    ...(lecture.hasHomework && hwData ? [{id:"hw", label:"📝 الواجب"}] : []),
    ...(lecture.hasQuiz    && quizData ? [{id:"quiz", label:"🎯 الاختبار"}] : []),
  ];

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{marginBottom:20}} onClick={onBack}>← العودة للكورس</button>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"Amiri,serif",fontSize:26,color:THEME.emeraldDark}}>{lecture.title}</h2>
          <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
            <span className="badge badge-gold">⏱ {lecture.duration}</span>
            {isCompleted && <span className="badge badge-emerald">✅ مكتمل</span>}
          </div>
        </div>
        {!isCompleted && (
          <button className="btn btn-primary btn-sm" onClick={() => markComplete(lecture.id)}>تحديد كمكتمل ✓</button>
        )}
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab==="videos" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {(lecture.videos||[]).length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📹</div><p>لا توجد فيديوهات في هذا الدرس</p></div>
          ) : (lecture.videos||[]).map(vid => (
            <div key={vid.id} className="card">
              <div className="video-player" style={{height:200}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#0D3D27,#1A6B47)",opacity:0.9}}/>
                <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                  <button className="play-btn">▶</button>
                  <span style={{color:"rgba(250,247,240,0.7)",fontSize:12,fontFamily:"Cairo"}}>انقر للتشغيل</span>
                </div>
              </div>
              <div className="card-body" style={{padding:"14px 20px"}}>
                <h4 style={{fontFamily:"Cairo,sans-serif",fontSize:15,fontWeight:600,marginBottom:4}}>{vid.title}</h4>
                <span style={{fontSize:12,color:THEME.inkMuted}}>⏱ {vid.duration}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="pdfs" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {(lecture.pdfs||[]).length===0 ? (
            <div className="empty-state"><div className="empty-icon">📄</div><p>لا توجد ملفات في هذا الدرس</p></div>
          ) : (lecture.pdfs||[]).map(pdf => (
            <div key={pdf.id} className="card" style={{cursor:"pointer"}}>
              <div className="card-body" style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:48,height:48,borderRadius:12,background:"rgba(220,38,38,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>📄</div>
                <div style={{flex:1}}>
                  <h4 style={{fontFamily:"Cairo,sans-serif",fontSize:15,fontWeight:600}}>{pdf.title}</h4>
                  <span style={{fontSize:12,color:THEME.inkMuted}}>انقر لتحميل الملف</span>
                </div>
                <button className="btn btn-ghost btn-sm">⬇ تحميل</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="hw" && (
        <div className="card">
          <div className="card-body">
            {hwData ? (
              <QuizView lectureId={lecture.id} quizData={hwData} onDone={()=>setTab("videos")} showToast={showToast} saveQuizScore={null}/>
            ) : (
              <div className="empty-state"><p>لا يوجد واجب لهذا الدرس</p></div>
            )}
          </div>
        </div>
      )}

      {tab==="quiz" && (
        <div className="card">
          <div className="card-body">
            {quizData ? (
              <>
                {prog.quizScores[lecture.id] !== undefined && (
                  <div style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,padding:12,marginBottom:16,fontFamily:"Cairo",fontSize:14,color:THEME.goldDark}}>
                    ✅ درجتك السابقة: <strong>{prog.quizScores[lecture.id]}%</strong>
                  </div>
                )}
                <QuizView lectureId={lecture.id} quizData={quizData} onDone={()=>setTab("videos")} showToast={showToast} saveQuizScore={saveQuizScore}/>
              </>
            ) : (
              <div className="empty-state"><p>لا يوجد اختبار لهذا الدرس</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// STUDENT DASHBOARD
// ============================================================
const StudentDashboard = ({ currentUser, store, showToast }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [payModal, setPayModal] = useState(null);

  const publishedCourses = store.courses.filter(c => c.published);
  const categories = ["الكل", ...new Set(store.courses.map(c => c.category))];

  const userPayments = store.payments.filter(p => p.userId===currentUser.id && p.status==="مكتمل");
  const unlockedCourseIds = userPayments.map(p => p.courseId);

  const filtered = publishedCourses.filter(c => {
    const matchSearch = c.title.includes(search) || (c.description||"").includes(search);
    const matchCat = category==="الكل" || c.category===category;
    return matchSearch && matchCat;
  });

  const getProgress = (courseId) => {
    const key = `${currentUser.id}-${courseId}`;
    const prog = store.progress[key];
    if (!prog) return 0;
    const total = store.lectures.filter(l => l.courseId===courseId).length;
    if (!total) return 0;
    return Math.round((prog.completed?.length || 0) / total * 100);
  };

  const markComplete = (lectureId) => {
    if (!selectedCourse) return;
    const key = `${currentUser.id}-${selectedCourse.id}`;
    store.updateProgress(prev => {
      const cur = prev[key] || { completed: [], quizScores: {} };
      if (cur.completed.includes(lectureId)) return prev;
      return { ...prev, [key]: { ...cur, completed: [...cur.completed, lectureId] } };
    });
    showToast("✅ تم تحديد الدرس كمكتمل!", "success");
  };

  const saveQuizScore = (lectureId, score) => {
    if (!selectedCourse) return;
    const key = `${currentUser.id}-${selectedCourse.id}`;
    store.updateProgress(prev => {
      const cur = prev[key] || { completed: [], quizScores: {} };
      return { ...prev, [key]: { ...cur, quizScores: { ...cur.quizScores, [lectureId]: score } } };
    });
  };

  // LECTURE DETAIL VIEW
  if (selectedLecture && selectedCourse) {
    return (
      <LectureDetailView
        lecture={selectedLecture}
        course={selectedCourse}
        currentUser={currentUser}
        store={store}
        showToast={showToast}
        onBack={() => setSelectedLecture(null)}
        markComplete={markComplete}
        saveQuizScore={saveQuizScore}
      />
    );
  }

  // COURSE DETAIL VIEW
  if (selectedCourse) {
    const courseLectures = store.lectures.filter(l => l.courseId===selectedCourse.id).sort((a,b)=>a.order-b.order);
    const isUnlocked = unlockedCourseIds.includes(selectedCourse.id);
    const prog = getProgress(selectedCourse.id);

    return (
      <div>
        {payModal && (
          <PayModal course={payModal} currentUser={currentUser} store={store} showToast={showToast} onClose={()=>setPayModal(null)}/>
        )}

        <button className="btn btn-ghost btn-sm" style={{marginBottom:20}} onClick={()=>setSelectedCourse(null)}>← الرجوع للكورسات</button>

        <div className="card" style={{marginBottom:24}}>
          <div style={{height:140,background:`linear-gradient(135deg, ${selectedCourse.color||THEME.emerald}, #0D3D27)`,position:"relative",display:"flex",alignItems:"center",padding:"0 28px"}}>
            <div style={{fontSize:56}}>{selectedCourse.icon}</div>
            <div style={{marginRight:16}}>
              <div className="badge badge-gold" style={{marginBottom:8}}>{selectedCourse.category}</div>
              <h2 style={{fontFamily:"Amiri,serif",color:"#FAF7F0",fontSize:26}}>{selectedCourse.title}</h2>
            </div>
            {!isUnlocked && (
              <div style={{marginRight:"auto"}}>
                <button className="btn btn-primary" onClick={()=>setPayModal(selectedCourse)}>🔓 فتح الكورس — {selectedCourse.price} جنيه</button>
              </div>
            )}
          </div>
          <div className="card-body">
            <p style={{color:THEME.inkMuted,fontSize:15,lineHeight:1.8,fontFamily:"Cairo",marginBottom:16}}>{selectedCourse.description}</p>
            <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:isUnlocked?16:0}}>
              <span className="badge badge-gold">📚 {selectedCourse.lectures} محاضرة</span>
              <span className="badge badge-emerald">⏱ {selectedCourse.duration}</span>
              <span className="badge badge-blue">🎯 {selectedCourse.level}</span>
            </div>
            {isUnlocked && (
              <>
                <div className="divider"/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:14,fontFamily:"Cairo",color:THEME.inkMuted}}>التقدم في الكورس</span>
                  <span style={{fontSize:14,fontWeight:700,color:THEME.emerald,fontFamily:"Cairo"}}>{prog}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${prog}%`}}/></div>
              </>
            )}
          </div>
        </div>

        <h3 style={{fontFamily:"Amiri,serif",fontSize:22,color:THEME.emeraldDark,marginBottom:16}}>محتوى الكورس ({courseLectures.length} محاضرة)</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {courseLectures.map((lec, i) => {
            const progKey = `${currentUser.id}-${selectedCourse.id}`;
            const prog2 = store.progress[progKey] || { completed: [] };
            const completed = prog2.completed.includes(lec.id);
            const locked = !isUnlocked && !lec.free;
            return (
              <div key={lec.id} className="card" style={{cursor:locked?"not-allowed":"pointer",opacity:locked?0.7:1}}
                onClick={()=>{ if (!locked) setSelectedLecture(lec); else setPayModal(selectedCourse); }}>
                <div className="card-body" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px"}}>
                  <div style={{
                    width:36,height:36,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,fontFamily:"Cairo",
                    background:completed?"rgba(22,163,74,0.12)":locked?"rgba(26,18,8,0.06)":"rgba(201,168,76,0.12)",
                    color:completed?"#16A34A":locked?THEME.inkMuted:THEME.goldDark
                  }}>
                    {completed?"✓":locked?"🔒":i+1}
                  </div>
                  <div style={{flex:1}}>
                    <h4 style={{fontFamily:"Cairo,sans-serif",fontSize:15,fontWeight:600,marginBottom:3}}>{lec.title}</h4>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:THEME.inkMuted}}>⏱ {lec.duration}</span>
                      <span style={{fontSize:12,color:THEME.inkMuted}}>📹 {(lec.videos||[]).length} فيديو</span>
                      {(lec.pdfs||[]).length>0 && <span style={{fontSize:12,color:THEME.inkMuted}}>📄 {lec.pdfs.length} ملف</span>}
                      {lec.hasQuiz && lec.quiz && <span style={{fontSize:12,color:THEME.inkMuted}}>🎯 اختبار</span>}
                      {lec.free && <span className="badge badge-emerald" style={{fontSize:11,padding:"2px 8px"}}>مجاني</span>}
                    </div>
                  </div>
                  {!locked && <span style={{color:THEME.inkMuted,fontSize:18}}>←</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MAIN COURSES VIEW
  return (
    <div>
      {payModal && (
        <PayModal course={payModal} currentUser={currentUser} store={store} showToast={showToast} onClose={()=>setPayModal(null)}/>
      )}

      <div style={{background:"linear-gradient(135deg, #0D3D27, #1A6B47)",borderRadius:20,padding:"28px 32px",marginBottom:28,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,left:-40,width:200,height:200,borderRadius:"50%",background:"rgba(201,168,76,0.06)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <h2 style={{fontFamily:"Amiri,serif",color:"#E8C97A",fontSize:28,marginBottom:6}}>
            أهلاً وسهلاً، {(currentUser.name||"").split(" ")[0]} 👋
          </h2>
          <p style={{color:"rgba(250,247,240,0.75)",fontSize:15,fontFamily:"Cairo"}}>استمر في رحلتك التعليمية واحتل المراتب الأولى</p>
        </div>
        <div style={{display:"flex",gap:20,position:"relative",zIndex:1,flexWrap:"wrap"}}>
          {[{v:unlockedCourseIds.length,l:"كورسات مفتوحة"},{v:userPayments.length,l:"مدفوعات"}].map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontFamily:"Cairo,sans-serif",fontSize:28,fontWeight:700,color:"#E8C97A"}}>{s.v}</div>
              <div style={{fontSize:12,color:"rgba(250,247,240,0.6)",fontFamily:"Cairo"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <div className="search-box" style={{flex:1,minWidth:200}}>
          <span>🔍</span>
          <input className="search-input" placeholder="ابحث عن كورس..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {categories.map(cat=>(
            <span key={cat} className={`chip ${category===cat?"active":""}`} onClick={()=>setCategory(cat)}>{cat}</span>
          ))}
        </div>
      </div>

      {filtered.length===0 ? (
        <div className="empty-state"><div className="empty-icon">📚</div><p>لا توجد كورسات مطابقة للبحث</p></div>
      ) : (
        <div className="courses-grid">
          {filtered.map(course => {
            const unlocked = unlockedCourseIds.includes(course.id);
            const prog = getProgress(course.id);
            return (
              <div key={course.id} className="course-card" onClick={()=>setSelectedCourse(course)}>
                <div className="course-thumb" style={{background:`linear-gradient(135deg, ${course.color||THEME.emerald}, #0D3D27)`}}>
                  <div className="course-thumb-pattern"/>
                  <span style={{position:"relative",zIndex:1,fontSize:52}}>{course.icon}</span>
                  {!unlocked && <div className="locked-overlay"><span className="lock-icon">🔒</span></div>}
                  {course.featured && (
                    <div style={{position:"absolute",top:10,right:10,zIndex:2}}>
                      <span className="badge badge-gold">⭐ مميز</span>
                    </div>
                  )}
                </div>
                <div className="course-info">
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                    <span className="badge badge-gold" style={{fontSize:11}}>{course.category}</span>
                    <span className="badge badge-blue" style={{fontSize:11}}>{course.level}</span>
                  </div>
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-desc">{course.description}</p>
                  <div className="course-meta">
                    <span className="course-price">{unlocked?"مفتوح ✅":`${course.price} جنيه`}</span>
                    <span className="course-lectures">📚 {course.lectures} محاضرة</span>
                  </div>
                  {unlocked && prog>0 && (
                    <div>
                      <div className="progress-bar" style={{marginTop:10}}>
                        <div className="progress-fill" style={{width:`${prog}%`}}/>
                      </div>
                      <div style={{fontSize:11,color:THEME.inkMuted,textAlign:"left",marginTop:4,fontFamily:"Cairo"}}>التقدم: {prog}%</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
// ADMIN PANEL
// ============================================================
const AdminPanel = ({ currentUser, store, showToast }) => {
  const [view, setView] = useState("courses");
  const [editCourse, setEditCourse] = useState(null);
  const [editLecture, setEditLecture] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ title:"", description:"", category:"نحو", price:"", icon:"📖", level:"مبتدئ", published:true, featured:false, duration:"", color:"#1A6B47" });
  const [lectureForm, setLectureForm] = useState({ title:"", duration:"", free:false, hasQuiz:false, hasHomework:false, quiz:null, homework:null });
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showLectureForm, setShowLectureForm] = useState(false);
  const [quizBuilderTab, setQuizBuilderTab] = useState("quiz"); // "quiz" | "homework"

  const saveCourse = () => {
    if (!courseForm.title) { showToast("عنوان الكورس مطلوب", "error"); return; }
    if (editCourse) {
      store.updateCourses(prev => prev.map(c => c.id===editCourse.id ? {
        ...c, ...courseForm,
        price: Number(courseForm.price),
        lectures: store.lectures.filter(l=>l.courseId===c.id).length
      } : c));
      showToast("✅ تم تحديث الكورس", "success");
    } else {
      const newC = { id:Date.now(), ...courseForm, price:Number(courseForm.price), lectures:0, thumbnail:null };
      store.updateCourses(prev=>[...prev,newC]);
      showToast("✅ تم إضافة الكورس", "success");
    }
    setEditCourse(null);
    setShowCourseForm(false);
    setCourseForm({title:"",description:"",category:"نحو",price:"",icon:"📖",level:"مبتدئ",published:true,featured:false,duration:"",color:"#1A6B47"});
  };

  const deleteCourse = (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الكورس؟")) return;
    store.updateCourses(prev=>prev.filter(c=>c.id!==id));
    store.updateLectures(prev=>prev.filter(l=>l.courseId!==id));
    showToast("🗑️ تم حذف الكورس", "info");
  };

  const saveLecture = () => {
    if (!lectureForm.title) { showToast("عنوان المحاضرة مطلوب", "error"); return; }
    if (editLecture) {
      store.updateLectures(prev => prev.map(l => l.id===editLecture.id ? { ...l, ...lectureForm } : l));
      showToast("✅ تم تحديث المحاضرة", "success");
    } else {
      const existing = store.lectures.filter(l=>l.courseId===selectedCourse.id);
      const newL = {
        id: Date.now(),
        courseId: selectedCourse.id,
        order: existing.length+1,
        videos: [],
        pdfs: [],
        ...lectureForm,
      };
      store.updateLectures(prev=>[...prev,newL]);
      store.updateCourses(prev=>prev.map(c=>c.id===selectedCourse.id?{...c,lectures:existing.length+1}:c));
      showToast("✅ تم إضافة المحاضرة", "success");
    }
    setEditLecture(null);
    setShowLectureForm(false);
    setLectureForm({title:"",duration:"",free:false,hasQuiz:false,hasHomework:false,quiz:null,homework:null});
  };

  const deleteLecture = (id) => {
    if (!window.confirm("هل أنت متأكد؟")) return;
    store.updateLectures(prev=>prev.filter(l=>l.id!==id));
    showToast("🗑️ تم حذف المحاضرة", "info");
  };

  const openEditCourse = (c) => {
    setEditCourse(c);
    setCourseForm({
      title:c.title, description:c.description||"", category:c.category,
      price:c.price, icon:c.icon, level:c.level,
      published:c.published, featured:c.featured||false,
      duration:c.duration||"", color:c.color||"#1A6B47"
    });
    setShowCourseForm(true);
  };

  const openEditLecture = (lec) => {
    setEditLecture(lec);
    setLectureForm({
      title:lec.title, duration:lec.duration||"", free:lec.free||false,
      hasQuiz:lec.hasQuiz||false, hasHomework:lec.hasHomework||false,
      quiz:lec.quiz||null, homework:lec.homework||null,
      videos:lec.videos||[], pdfs:lec.pdfs||[]
    });
    setShowLectureForm(true);
  };

  const addCouponPrompt = () => {
    const code = window.prompt("أدخل الكود الجديد:");
    if (!code) return;
    const disc = window.prompt("قيمة الخصم (رقم):");
    if (!disc || isNaN(Number(disc))) { showToast("قيمة الخصم غير صحيحة", "error"); return; }
    const type = window.confirm("هل الخصم نسبة مئوية؟\nاختر موافق للنسبة المئوية، إلغاء لمبلغ ثابت") ? "percent" : "fixed";
    store.updateCoupons(prev=>[...prev,{id:Date.now(),code:code.toUpperCase(),discount:Number(disc),type,uses:0,maxUses:100,active:true}]);
    showToast("✅ تم إضافة الكود", "success");
  };

  const sideItems = [
    {id:"courses", icon:"📚", label:"إدارة الكورسات"},
    {id:"payments",icon:"💳", label:"المدفوعات"},
    {id:"coupons", icon:"🎟️",label:"أكواد الخصم"},
    {id:"students",icon:"👨‍🎓",label:"الطلاب"},
  ];

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{fontSize:11,opacity:0.5,marginBottom:4,fontFamily:"Cairo",letterSpacing:1}}>ADMIN PANEL</div>
          لوحة الإدارة
        </div>
        {sideItems.map(item=>(
          <button key={item.id} className={`sidebar-link ${view===item.id?"active":""}`} onClick={()=>{setView(item.id);setSelectedCourse(null);}}>
            <span>{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </aside>

      <main className="dash-main">
        {/* ── Courses List ── */}
        {view==="courses" && !selectedCourse && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 className="dash-title">إدارة الكورسات</h1>
                <p className="dash-subtitle">{store.courses.length} كورس في المنصة</p>
              </div>
              <button className="btn btn-emerald" onClick={()=>{setEditCourse(null);setCourseForm({title:"",description:"",category:"نحو",price:"",icon:"📖",level:"مبتدئ",published:true,featured:false,duration:"",color:"#1A6B47"});setShowCourseForm(true);}}>+ إضافة كورس جديد</button>
            </div>

            {showCourseForm && (
              <div className="card" style={{marginBottom:24}}>
                <div className="card-body">
                  <h3 style={{fontFamily:"Amiri,serif",fontSize:20,color:THEME.emeraldDark,marginBottom:20}}>{editCourse?"✏️ تعديل الكورس":"➕ إضافة كورس جديد"}</h3>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div className="input-group" style={{gridColumn:"1/-1"}}>
                      <label className="input-label">عنوان الكورس *</label>
                      <input className="input-field" value={courseForm.title} onChange={e=>setCourseForm({...courseForm,title:e.target.value})} placeholder="مثال: النحو والصرف للمبتدئين"/>
                    </div>
                    <div className="input-group" style={{gridColumn:"1/-1"}}>
                      <label className="input-label">وصف الكورس</label>
                      <textarea className="input-field" rows={3} value={courseForm.description} onChange={e=>setCourseForm({...courseForm,description:e.target.value})} placeholder="وصف مختصر عن محتوى الكورس"/>
                    </div>
                    <div className="input-group">
                      <label className="input-label">التصنيف</label>
                      <select className="input-field" value={courseForm.category} onChange={e=>setCourseForm({...courseForm,category:e.target.value})}>
                        {["نحو","إملاء","أدب","بلاغة","قراءة","تعبير"].map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">السعر (جنيه)</label>
                      <input className="input-field" type="number" min="0" value={courseForm.price} onChange={e=>setCourseForm({...courseForm,price:e.target.value})} placeholder="299"/>
                    </div>
                    <div className="input-group">
                      <label className="input-label">المستوى</label>
                      <select className="input-field" value={courseForm.level} onChange={e=>setCourseForm({...courseForm,level:e.target.value})}>
                        {["مبتدئ","متوسط","متقدم"].map(l=><option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">المدة الزمنية</label>
                      <input className="input-field" value={courseForm.duration} onChange={e=>setCourseForm({...courseForm,duration:e.target.value})} placeholder="مثال: 8 ساعات"/>
                    </div>
                    <div className="input-group">
                      <label className="input-label">الإيموجي</label>
                      <input className="input-field" value={courseForm.icon} onChange={e=>setCourseForm({...courseForm,icon:e.target.value})} placeholder="📖" style={{fontSize:24,textAlign:"center"}}/>
                    </div>
                    <div className="input-group">
                      <label className="input-label">لون الكورس</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={courseForm.color} onChange={e=>setCourseForm({...courseForm,color:e.target.value})} style={{width:48,height:40,borderRadius:8,border:"1.5px solid rgba(201,168,76,0.3)",cursor:"pointer",padding:4}}/>
                        <input className="input-field" value={courseForm.color} onChange={e=>setCourseForm({...courseForm,color:e.target.value})} style={{flex:1}} placeholder="#1A6B47"/>
                      </div>
                    </div>
                    <div className="input-group" style={{gridColumn:"1/-1"}}>
                      <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                          <label className="toggle">
                            <input type="checkbox" checked={courseForm.published} onChange={e=>setCourseForm({...courseForm,published:e.target.checked})}/>
                            <span className="toggle-slider"/>
                          </label>
                          <span className="input-label" style={{marginBottom:0}}>نشر الكورس للطلاب</span>
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                          <label className="toggle">
                            <input type="checkbox" checked={courseForm.featured} onChange={e=>setCourseForm({...courseForm,featured:e.target.checked})}/>
                            <span className="toggle-slider"/>
                          </label>
                          <span className="input-label" style={{marginBottom:0}}>كورس مميز ⭐</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:8}}>
                    <button className="btn btn-emerald" onClick={saveCourse}>{editCourse?"💾 حفظ التعديلات":"➕ إضافة الكورس"}</button>
                    <button className="btn btn-ghost" onClick={()=>{setShowCourseForm(false);setEditCourse(null);}}>إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="table">
                <thead><tr><th>الكورس</th><th>التصنيف</th><th>السعر</th><th>المحاضرات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {store.courses.length===0 ? (
                    <tr><td colSpan={6} style={{textAlign:"center",padding:32,color:THEME.inkMuted,fontFamily:"Cairo"}}>لا توجد كورسات بعد</td></tr>
                  ) : store.courses.map(c=>(
                    <tr key={c.id}>
                      <td><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>{c.icon}</span><div><div style={{fontWeight:600,fontSize:14,fontFamily:"Cairo"}}>{c.title}</div><div style={{fontSize:12,color:THEME.inkMuted}}>{c.level}</div></div></div></td>
                      <td><span className="badge badge-gold">{c.category}</span></td>
                      <td><span style={{fontWeight:700,color:THEME.goldDark,fontFamily:"Cairo"}}>{c.price} جنيه</span></td>
                      <td><span className="badge badge-blue">{store.lectures.filter(l=>l.courseId===c.id).length} محاضرة</span></td>
                      <td>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          <span className={`badge ${c.published?"badge-emerald":"badge-red"}`}>{c.published?"منشور":"مخفي"}</span>
                          {c.featured && <span className="badge badge-gold">⭐ مميز</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedCourse(c)}>📚 محاضرات</button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>openEditCourse(c)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteCourse(c.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Lecture Management ── */}
        {view==="courses" && selectedCourse && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{marginBottom:20}} onClick={()=>setSelectedCourse(null)}>← العودة للكورسات</button>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 className="dash-title">{selectedCourse.icon} {selectedCourse.title}</h1>
                <p className="dash-subtitle">إدارة محاضرات الكورس</p>
              </div>
              <button className="btn btn-emerald" onClick={()=>{setEditLecture(null);setLectureForm({title:"",duration:"",free:false,hasQuiz:false,hasHomework:false,quiz:null,homework:null,videos:[],pdfs:[]});setShowLectureForm(true);}}>+ إضافة محاضرة</button>
            </div>

            {showLectureForm && (
              <div className="card" style={{marginBottom:24}}>
                <div className="card-body">
                  <h3 style={{fontFamily:"Amiri,serif",fontSize:20,color:THEME.emeraldDark,marginBottom:20}}>{editLecture?"تعديل المحاضرة":"إضافة محاضرة جديدة"}</h3>

                  <div className="input-group">
                    <label className="input-label">عنوان المحاضرة *</label>
                    <input className="input-field" value={lectureForm.title} onChange={e=>setLectureForm({...lectureForm,title:e.target.value})} placeholder="مثال: مقدمة في النحو العربي"/>
                  </div>
                  <div className="input-group">
                    <label className="input-label">المدة الزمنية</label>
                    <input className="input-field" value={lectureForm.duration} onChange={e=>setLectureForm({...lectureForm,duration:e.target.value})} placeholder="مثال: 45 دقيقة"/>
                  </div>

                  <div style={{display:"flex",gap:24,flexWrap:"wrap",marginBottom:20}}>
                    <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                      <label className="toggle">
                        <input type="checkbox" checked={lectureForm.free} onChange={e=>setLectureForm({...lectureForm,free:e.target.checked})}/>
                        <span className="toggle-slider"/>
                      </label>
                      <span className="input-label" style={{marginBottom:0}}>محاضرة مجانية</span>
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                      <label className="toggle">
                        <input type="checkbox" checked={lectureForm.hasQuiz} onChange={e=>setLectureForm({...lectureForm,hasQuiz:e.target.checked})}/>
                        <span className="toggle-slider"/>
                      </label>
                      <span className="input-label" style={{marginBottom:0}}>يحتوي على اختبار</span>
                    </label>
                    <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                      <label className="toggle">
                        <input type="checkbox" checked={lectureForm.hasHomework} onChange={e=>setLectureForm({...lectureForm,hasHomework:e.target.checked})}/>
                        <span className="toggle-slider"/>
                      </label>
                      <span className="input-label" style={{marginBottom:0}}>يحتوي على واجب</span>
                    </label>
                  </div>

                  {/* Quiz Builder Tabs */}
                  {(lectureForm.hasQuiz || lectureForm.hasHomework) && (
                    <div style={{border:"1.5px solid rgba(201,168,76,0.25)",borderRadius:12,padding:20,marginBottom:16}}>
                      <div style={{display:"flex",gap:8,marginBottom:16}}>
                        {lectureForm.hasQuiz && (
                          <button className={`tab ${quizBuilderTab==="quiz"?"active":""}`} onClick={()=>setQuizBuilderTab("quiz")}>🎯 بناء الاختبار</button>
                        )}
                        {lectureForm.hasHomework && (
                          <button className={`tab ${quizBuilderTab==="homework"?"active":""}`} onClick={()=>setQuizBuilderTab("homework")}>📝 بناء الواجب</button>
                        )}
                      </div>

                      {quizBuilderTab==="quiz" && lectureForm.hasQuiz && (
                        <QuizBuilder
                          quiz={lectureForm.quiz}
                          onChange={q=>setLectureForm({...lectureForm,quiz:q})}
                        />
                      )}
                      {quizBuilderTab==="homework" && lectureForm.hasHomework && (
                        <QuizBuilder
                          quiz={lectureForm.homework}
                          onChange={q=>setLectureForm({...lectureForm,homework:q})}
                        />
                      )}
                    </div>
                  )}

                  <div style={{display:"flex",gap:10}}>
                    <button className="btn btn-emerald" onClick={saveLecture}>{editLecture?"💾 حفظ":"➕ إضافة"}</button>
                    <button className="btn btn-ghost" onClick={()=>{setShowLectureForm(false);setEditLecture(null);}}>إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {store.lectures.filter(l=>l.courseId===selectedCourse.id).sort((a,b)=>a.order-b.order).map((lec,i)=>(
                <div key={lec.id} className="card">
                  <div className="card-body" style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(201,168,76,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:THEME.goldDark,fontFamily:"Cairo",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:150}}>
                      <h4 style={{fontFamily:"Cairo,sans-serif",fontSize:15,fontWeight:600,marginBottom:3}}>{lec.title}</h4>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {lec.duration && <span style={{fontSize:12,color:THEME.inkMuted}}>⏱ {lec.duration}</span>}
                        <span style={{fontSize:12,color:THEME.inkMuted}}>📹 {(lec.videos||[]).length} فيديو</span>
                        <span style={{fontSize:12,color:THEME.inkMuted}}>📄 {(lec.pdfs||[]).length} ملف</span>
                        {lec.hasQuiz && lec.quiz && <span className="badge badge-blue" style={{fontSize:11,padding:"2px 8px"}}>🎯 اختبار ({(lec.quiz.questions||[]).length} أسئلة)</span>}
                        {lec.hasHomework && lec.homework && <span className="badge badge-gold" style={{fontSize:11,padding:"2px 8px"}}>📝 واجب ({(lec.homework.questions||[]).length} أسئلة)</span>}
                        {lec.free && <span className="badge badge-emerald" style={{fontSize:11,padding:"2px 8px"}}>مجاني</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEditLecture(lec)}>✏️ تعديل</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>deleteLecture(lec.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              {store.lectures.filter(l=>l.courseId===selectedCourse.id).length===0 && (
                <div className="empty-state"><div className="empty-icon">📚</div><p>لا توجد محاضرات بعد — ابدأ بإضافة أول محاضرة</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Payments ── */}
        {view==="payments" && (
          <div>
            <div className="dash-header">
              <h1 className="dash-title">المدفوعات</h1>
              <p className="dash-subtitle">{store.payments.length} عملية دفع إجمالاً</p>
            </div>
            <div className="stats-grid" style={{marginBottom:24}}>
              {[
                {icon:"💰",v:`${store.payments.filter(p=>p.status==="مكتمل").reduce((s,p)=>s+p.amount,0)} جنيه`,l:"إجمالي الإيرادات"},
                {icon:"✅",v:store.payments.filter(p=>p.status==="مكتمل").length,l:"مدفوعات مكتملة"},
                {icon:"⏳",v:store.payments.filter(p=>p.status==="معلق").length,l:"مدفوعات معلقة"},
              ].map((s,i)=>(
                <div key={i} className="stat-card"><div className="stat-icon">{s.icon}</div><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
              ))}
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>الطالب</th><th>الكورس</th><th>المبلغ</th><th>طريقة الدفع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {store.payments.length===0 ? (
                    <tr><td colSpan={6} style={{textAlign:"center",padding:32,color:THEME.inkMuted,fontFamily:"Cairo"}}>لا توجد مدفوعات بعد</td></tr>
                  ) : store.payments.map(p=>{
                    const user  = store.users.find(u=>u.id===p.userId);
                    const course= store.courses.find(c=>c.id===p.courseId);
                    return (
                      <tr key={p.id}>
                        <td style={{fontFamily:"Cairo",fontSize:14,fontWeight:500}}>{user?.name||"—"}</td>
                        <td style={{fontFamily:"Cairo",fontSize:14}}>{course?.title||"—"}</td>
                        <td style={{fontWeight:700,color:THEME.goldDark,fontFamily:"Cairo"}}>{p.amount} جنيه</td>
                        <td style={{fontFamily:"Cairo",fontSize:13}}>{p.method}</td>
                        <td><span className={`badge ${p.status==="مكتمل"?"badge-emerald":"badge-gold"}`}>{p.status}</span></td>
                        <td style={{fontSize:13,color:THEME.inkMuted}}>{p.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Coupons ── */}
        {view==="coupons" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <div><h1 className="dash-title">أكواد الخصم</h1><p className="dash-subtitle">{store.coupons.length} كود</p></div>
              <button className="btn btn-emerald" onClick={addCouponPrompt}>+ إضافة كود</button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>الكود</th><th>الخصم</th><th>الاستخدامات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {store.coupons.length===0 ? (
                    <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:THEME.inkMuted,fontFamily:"Cairo"}}>لا توجد أكواد بعد</td></tr>
                  ) : store.coupons.map(c=>(
                    <tr key={c.id}>
                      <td><code style={{background:THEME.parchment,padding:"4px 10px",borderRadius:6,fontSize:13,fontFamily:"monospace",fontWeight:700,letterSpacing:1}}>{c.code}</code></td>
                      <td style={{fontWeight:700,color:THEME.goldDark}}>{c.discount}{c.type==="percent"?"%":" جنيه"}</td>
                      <td style={{fontSize:13,color:THEME.inkMuted}}>{c.uses}/{c.maxUses}</td>
                      <td><span className={`badge ${c.active?"badge-emerald":"badge-red"}`}>{c.active?"فعّال":"متوقف"}</span></td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>store.updateCoupons(prev=>prev.map(cp=>cp.id===c.id?{...cp,active:!cp.active}:cp))}>{c.active?"إيقاف":"تفعيل"}</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>store.updateCoupons(prev=>prev.filter(cp=>cp.id!==c.id))}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Students ── */}
        {view==="students" && (
          <div>
            <div className="dash-header">
              <h1 className="dash-title">الطلاب</h1>
              <p className="dash-subtitle">{store.users.filter(u=>u.role==="student").length} طالب مسجل</p>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>الطالب</th><th>رقم الهاتف</th><th>الدور</th><th>تاريخ التسجيل</th><th>الكورسات</th></tr></thead>
                <tbody>
                  {store.users.length===0 ? (
                    <tr><td colSpan={5} style={{textAlign:"center",padding:32,color:THEME.inkMuted,fontFamily:"Cairo"}}>لا يوجد مستخدمون</td></tr>
                  ) : store.users.map(u=>(
                    <tr key={u.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#1A6B47)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{u.avatar}</div>
                          <span style={{fontFamily:"Cairo",fontSize:14,fontWeight:500}}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{fontSize:13,color:THEME.inkMuted,direction:"ltr",textAlign:"right"}}>{u.phone||"—"}</td>
                      <td><span className={`badge ${u.role==="owner"?"badge-gold":u.role==="admin"?"badge-blue":"badge-emerald"}`}>{u.role==="owner"?"مالك":u.role==="admin"?"مدير":"طالب"}</span></td>
                      <td style={{fontSize:13,color:THEME.inkMuted}}>{u.joinedAt}</td>
                      <td style={{fontFamily:"Cairo",fontSize:13}}>{store.payments.filter(p=>p.userId===u.id&&p.status==="مكتمل").length} كورس</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================
// OWNER PANEL
// ============================================================
const OwnerPanel = ({ currentUser, store, showToast }) => {
  const [view, setView] = useState("roles");
  const [landingEdit, setLandingEdit] = useState(() => ({...store.landingContent}));

  // Sync if store updates externally
  useEffect(() => {
    setLandingEdit({...store.landingContent});
  }, [store.landingContent]);

  const sideItems = [
    {id:"roles",   icon:"👑", label:"إدارة الأدوار"},
    {id:"landing", icon:"🎨", label:"تخصيص الصفحة الرئيسية"},
    {id:"overview",icon:"📊", label:"نظرة عامة"},
  ];

  const changeRole = (userId, newRole) => {
    if (userId===currentUser.id) { showToast("لا يمكنك تغيير دورك الخاص", "error"); return; }
    store.updateUsers(prev => prev.map(u => u.id===userId?{...u,role:newRole}:u));
    showToast(`✅ تم تغيير الدور إلى: ${newRole==="owner"?"مالك":newRole==="admin"?"مدير":"طالب"}`, "success");
  };

  const saveLanding = () => {
    store.updateLanding(landingEdit);
    showToast("✅ تم حفظ تغييرات الصفحة الرئيسية", "success");
  };

  return (
    <div className="dash-layout">
      <aside className="sidebar" style={{background:"#1A1208"}}>
        <div className="sidebar-brand" style={{color:"#E8C97A",borderColor:"rgba(201,168,76,0.15)"}}>
          <div style={{fontSize:11,opacity:0.5,marginBottom:4,fontFamily:"Cairo",letterSpacing:1}}>OWNER PANEL</div>
          <span>👑 لوحة المالك</span>
        </div>
        {sideItems.map(item=>(
          <button key={item.id} className={`sidebar-link ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}>
            <span>{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </aside>

      <main className="dash-main">
        {/* ── Role Management ── */}
        {view==="roles" && (
          <div>
            <div className="dash-header">
              <h1 className="dash-title">👑 إدارة أدوار المستخدمين</h1>
              <p className="dash-subtitle">تحكم في صلاحيات كل مستخدم في المنصة</p>
            </div>

            <div className="card" style={{marginBottom:24,background:"rgba(201,168,76,0.04)",borderColor:"rgba(201,168,76,0.2)"}}>
              <div className="card-body">
                <h4 style={{fontFamily:"Cairo,sans-serif",fontSize:15,fontWeight:600,color:THEME.goldDark,marginBottom:12}}>🔐 شرح نظام الأدوار</h4>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
                  {[{role:"student",color:"#16A34A",label:"طالب",desc:"وصول للكورسات المدفوعة فقط"},{role:"admin",color:"#2563EB",label:"مدير",desc:"إدارة الكورسات والمحاضرات"},{role:"owner",color:"#8B6914",label:"مالك",desc:"تحكم كامل في المنصة"}].map(r=>(
                    <div key={r.role} style={{padding:12,borderRadius:10,border:`1.5px solid ${r.color}44`,background:`${r.color}08`}}>
                      <div style={{fontWeight:700,color:r.color,fontFamily:"Cairo",marginBottom:4}}>{r.label}</div>
                      <div style={{fontSize:12,color:THEME.inkMuted}}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead><tr><th>المستخدم</th><th>رقم الهاتف</th><th>الدور الحالي</th><th>تغيير الدور</th></tr></thead>
                <tbody>
                  {store.users.length===0 ? (
                    <tr><td colSpan={4} style={{textAlign:"center",padding:32,color:THEME.inkMuted,fontFamily:"Cairo"}}>لا يوجد مستخدمون</td></tr>
                  ) : store.users.map(u=>(
                    <tr key={u.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#1A6B47)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{u.avatar}</div>
                          <div>
                            <div style={{fontFamily:"Cairo",fontWeight:600,fontSize:14}}>{u.name}</div>
                            {u.id===currentUser.id && <span style={{fontSize:11,color:THEME.gold}}>أنت</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{fontSize:13,color:THEME.inkMuted,direction:"ltr",textAlign:"right"}}>{u.phone||"—"}</td>
                      <td><span className={`badge ${u.role==="owner"?"badge-gold":u.role==="admin"?"badge-blue":"badge-emerald"}`}>{u.role==="owner"?"👑 مالك":u.role==="admin"?"🔵 مدير":"🟢 طالب"}</span></td>
                      <td>
                        <select
                          className="input-field" style={{padding:"6px 10px",fontSize:13,maxWidth:140}}
                          value={u.role}
                          onChange={e=>changeRole(u.id,e.target.value)}
                          disabled={u.id===currentUser.id}
                        >
                          <option value="student">طالب</option>
                          <option value="admin">مدير</option>
                          <option value="owner">مالك</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Landing Page Editor ── */}
        {view==="landing" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
              <div><h1 className="dash-title">🎨 تخصيص الصفحة الرئيسية</h1><p className="dash-subtitle">تحكم في محتوى وتصميم صفحتك الأولى</p></div>
              <button className="btn btn-primary" onClick={saveLanding}>💾 حفظ التغييرات</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              {/* Hero Section */}
              <div className="card" style={{gridColumn:"1/-1"}}>
                <div className="card-body">
                  <h3 style={{fontFamily:"Amiri,serif",fontSize:18,color:THEME.emeraldDark,marginBottom:16}}>🖼️ صورة الهيرو (الخلفية)</h3>
                  <div className="input-group">
                    <label className="input-label">رابط صورة الخلفية (URL)</label>
                    <input
                      className="input-field"
                      type="url"
                      placeholder="https://example.com/image.jpg — اتركه فارغاً للتدرج الأخضر الافتراضي"
                      value={landingEdit.heroImage||""}
                      onChange={e=>setLandingEdit({...landingEdit,heroImage:e.target.value})}
                      style={{direction:"ltr",textAlign:"right"}}
                    />
                  </div>
                  {landingEdit.heroImage && (
                    <div style={{marginTop:8,borderRadius:12,overflow:"hidden",maxHeight:160,position:"relative"}}>
                      <img
                        src={landingEdit.heroImage}
                        alt="معاينة الخلفية"
                        style={{width:"100%",height:160,objectFit:"cover",display:"block"}}
                        onError={e=>{e.target.style.display="none";}}
                      />
                      <button
                        className="btn btn-danger btn-sm"
                        style={{position:"absolute",top:8,left:8}}
                        onClick={()=>setLandingEdit({...landingEdit,heroImage:""})}
                      >✕ إزالة الصورة</button>
                    </div>
                  )}
                  {!landingEdit.heroImage && (
                    <div style={{marginTop:8,padding:16,borderRadius:12,background:"linear-gradient(135deg,#0D3D27,#1A6B47)",textAlign:"center",color:"rgba(232,201,122,0.7)",fontFamily:"Cairo",fontSize:13}}>
                      سيُستخدم التدرج الأخضر الافتراضي
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Text */}
              <div className="card">
                <div className="card-body">
                  <h3 style={{fontFamily:"Amiri,serif",fontSize:18,color:THEME.emeraldDark,marginBottom:16}}>🏠 قسم الهيرو</h3>
                  <div className="input-group">
                    <label className="input-label">العنوان الرئيسي</label>
                    <input className="input-field" value={landingEdit.heroTitle||""} onChange={e=>setLandingEdit({...landingEdit,heroTitle:e.target.value})}/>
                  </div>
                  <div className="input-group">
                    <label className="input-label">العنوان الفرعي</label>
                    <input className="input-field" value={landingEdit.heroSubtitle||""} onChange={e=>setLandingEdit({...landingEdit,heroSubtitle:e.target.value})}/>
                  </div>
                  <div className="input-group">
                    <label className="input-label">الوصف</label>
                    <textarea className="input-field" rows={3} value={landingEdit.heroDesc||""} onChange={e=>setLandingEdit({...landingEdit,heroDesc:e.target.value})}/>
                  </div>
                </div>
              </div>

              {/* Teacher Section */}
              <div className="card">
                <div className="card-body">
                  <h3 style={{fontFamily:"Amiri,serif",fontSize:18,color:THEME.emeraldDark,marginBottom:16}}>👨‍🏫 قسم الأستاذ</h3>
                  <div className="input-group">
                    <label className="input-label">اسم الأستاذ</label>
                    <input className="input-field" value={landingEdit.teacherName||""} onChange={e=>setLandingEdit({...landingEdit,teacherName:e.target.value})}/>
                  </div>
                  <div className="input-group">
                    <label className="input-label">اللقب</label>
                    <input className="input-field" value={landingEdit.teacherTitle||""} onChange={e=>setLandingEdit({...landingEdit,teacherTitle:e.target.value})}/>
                  </div>
                  <div className="input-group">
                    <label className="input-label">السيرة الذاتية</label>
                    <textarea className="input-field" rows={4} value={landingEdit.teacherBio||""} onChange={e=>setLandingEdit({...landingEdit,teacherBio:e.target.value})}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Overview ── */}
        {view==="overview" && (
          <div>
            <div className="dash-header"><h1 className="dash-title">📊 نظرة عامة على المنصة</h1></div>
            <div className="stats-grid">
              {[
                {icon:"👥",v:store.users.length,l:"إجمالي المستخدمين"},
                {icon:"📚",v:store.courses.filter(c=>c.published).length,l:"كورسات منشورة"},
                {icon:"🎓",v:store.users.filter(u=>u.role==="student").length,l:"طلاب مسجلون"},
                {icon:"💰",v:`${store.payments.filter(p=>p.status==="مكتمل").reduce((s,p)=>s+p.amount,0)} جنيه`,l:"إجمالي الإيرادات"},
                {icon:"✅",v:store.payments.filter(p=>p.status==="مكتمل").length,l:"مدفوعات ناجحة"},
                {icon:"🎟️",v:store.coupons.filter(c=>c.active).length,l:"أكواد فعّالة"},
              ].map((s,i)=>(
                <div key={i} className="stat-card"><div className="stat-icon">{s.icon}</div><div className="stat-value" style={{fontSize:22}}>{s.v}</div><div className="stat-label">{s.l}</div></div>
              ))}
            </div>

            <div className="card" style={{marginTop:8}}>
              <div className="card-body">
                <h3 style={{fontFamily:"Amiri,serif",fontSize:20,color:THEME.emeraldDark,marginBottom:16}}>توزيع المستخدمين</h3>
                {store.users.length===0 ? (
                  <div className="empty-state"><p>لا يوجد مستخدمون</p></div>
                ) : (
                  [{role:"owner",label:"ملّاك",count:store.users.filter(u=>u.role==="owner").length,color:THEME.gold},{role:"admin",label:"مديرون",count:store.users.filter(u=>u.role==="admin").length,color:"#2563EB"},{role:"student",label:"طلاب",count:store.users.filter(u=>u.role==="student").length,color:THEME.emerald}].map(r=>(
                    <div key={r.role} style={{marginBottom:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontFamily:"Cairo",fontSize:14}}>
                        <span style={{fontWeight:600}}>{r.label}</span>
                        <span style={{color:THEME.inkMuted}}>{r.count} من {store.users.length}</span>
                      </div>
                      <div style={{height:8,background:"rgba(26,18,8,0.06)",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:4,background:r.color,width:`${store.users.length>0?Math.round(r.count/store.users.length*100):0}%`,transition:"width 0.6s ease"}}/>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================
// DASHBOARD WRAPPER (student view)
// ============================================================
const Dashboard = ({ currentUser, store, showToast }) => {
  const [view, setView] = useState("courses");

  const sideItems = [
    {id:"courses",   icon:"📚", label:"الكورسات"},
    {id:"my-courses",icon:"🎓", label:"كورساتي"},
    {id:"profile",   icon:"👤", label:"حسابي"},
  ];

  const unlockedIds = store.payments
    .filter(p => p.userId===currentUser.id && p.status==="مكتمل")
    .map(p => p.courseId);

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{fontSize:11,opacity:0.5,marginBottom:4,fontFamily:"Cairo",letterSpacing:1}}>STUDENT PANEL</div>
          لوحة الطالب
        </div>
        {sideItems.map(item=>(
          <button key={item.id} className={`sidebar-link ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}>
            <span>{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </aside>

      <main className="dash-main">
        {view==="courses" && (
          <StudentDashboard currentUser={currentUser} store={store} showToast={showToast}/>
        )}

        {view==="my-courses" && (
          <div>
            <div className="dash-header">
              <h1 className="dash-title">كورساتي المدفوعة</h1>
              <p className="dash-subtitle">{unlockedIds.length} كورس مفتوح</p>
            </div>
            {unlockedIds.length===0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <p>لم تشترك في أي كورس بعد</p>
                <br/>
                <button className="btn btn-emerald" onClick={()=>setView("courses")}>تصفح الكورسات</button>
              </div>
            ) : (
              <div className="courses-grid">
                {store.courses.filter(c=>unlockedIds.includes(c.id)).map(c=>(
                  <div key={c.id} className="course-card">
                    <div className="course-thumb" style={{background:`linear-gradient(135deg, ${c.color||THEME.emerald}, #0D3D27)`}}>
                      <div className="course-thumb-pattern"/>
                      <span style={{position:"relative",zIndex:1,fontSize:52}}>{c.icon}</span>
                    </div>
                    <div className="course-info">
                      <span className="badge badge-emerald" style={{marginBottom:8}}>✅ مفتوح</span>
                      <h3 className="course-title">{c.title}</h3>
                      <span className="course-lectures">📚 {store.lectures.filter(l=>l.courseId===c.id).length} محاضرة</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view==="profile" && (
          <div>
            <div className="dash-header"><h1 className="dash-title">حسابي الشخصي</h1></div>
            <div className="card" style={{maxWidth:480}}>
              <div className="card-body">
                <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24}}>
                  <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#1A6B47)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:"#fff"}}>{currentUser.avatar}</div>
                  <div>
                    <h2 style={{fontFamily:"Amiri,serif",fontSize:24,color:THEME.emeraldDark}}>{currentUser.name}</h2>
                    <span className={`badge ${currentUser.role==="owner"?"badge-gold":currentUser.role==="admin"?"badge-blue":"badge-emerald"}`}>
                      {currentUser.role==="owner"?"👑 مالك":currentUser.role==="admin"?"🔵 مدير":"🟢 طالب"}
                    </span>
                  </div>
                </div>
                <div className="divider"/>
                {[
                  {l:"رقم الهاتف",    v:currentUser.phone||"—"},
                  {l:"تاريخ التسجيل", v:currentUser.joinedAt||"—"},
                  {l:"الكورسات المفتوحة",v:`${unlockedIds.length} كورس`}
                ].map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(201,168,76,0.08)",fontFamily:"Cairo",fontSize:14}}>
                    <span style={{color:THEME.inkMuted}}>{r.l}</span>
                    <span style={{fontWeight:600}}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const store = useStore();
  const auth  = useAuth(store);
  const [page, setPage]           = useState("landing");
  const [transition, setTransition] = useState(false);
  const [toast, setToast]         = useState(null);

  const navigate = useCallback((newPage) => {
    setTransition(true);
    setTimeout(() => { setPage(newPage); setTransition(false); }, 300);
  }, []);

  const showToast = useCallback((message, type="info") => {
    setToast({ message, type });
  }, []);

  const handleLogin = useCallback((phone, password) => {
    const res = auth.login(phone, password);
    if (res.success) {
      showToast(`🎉 أهلاً بك، ${(res.user.name||"").split(" ")[0]}!`, "success");
      navigate("dashboard");
    }
    return res;
  }, [auth, navigate, showToast]);

  const handleRegister = useCallback((name, phone, password) => {
    const res = auth.register(name, phone, password);
    if (res.success) {
      showToast("🎉 تم إنشاء حسابك بنجاح!", "success");
      navigate("dashboard");
    }
    return res;
  }, [auth, navigate, showToast]);

  const handleLogout = useCallback(() => {
    auth.logout();
    showToast("👋 تم تسجيل الخروج", "info");
    navigate("landing");
  }, [auth, navigate, showToast]);

  // Sync current user if owner changes their role
  useEffect(() => {
    if (auth.currentUser) auth.refreshUser();
  }, [store.users]);

  const showLandingNav = page==="landing";
  const showNavbar     = !["landing","login","register"].includes(page);

  return (
    <>
      <style>{styles}</style>

      {toast && <Toast toast={toast} onClose={()=>setToast(null)}/>}

      {/* LANDING NAV */}
      {showLandingNav && (
        <nav className="navbar" style={{background:"rgba(13,61,39,0.9)"}}>
          <span className="nav-brand" style={{color:"#E8C97A"}}>اكاديمية مستر مصطفى<br/>لتدريس اللغة العربية</span>
          <div className="nav-links">
            {!auth.currentUser ? (
              <>
                <button className="nav-link" style={{color:"rgba(250,247,240,0.8)"}} onClick={()=>navigate("login")}>تسجيل الدخول</button>
                <button className="btn btn-primary btn-sm" onClick={()=>navigate("register")}>إنشاء حساب</button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={()=>navigate("dashboard")}>لوحتي التعليمية →</button>
            )}
          </div>
        </nav>
      )}

      {/* INNER PAGES NAV */}
      {showNavbar && (
        <Navbar page={page} setPage={navigate} currentUser={auth.currentUser} onLogout={handleLogout}/>
      )}

      {/* PAGE TRANSITION WRAPPER */}
      <div style={{opacity:transition?0:1,transition:"opacity 0.3s ease",minHeight:"100vh"}}>
        {page==="landing" && (
          <LandingPage setPage={navigate} content={store.landingContent}/>
        )}
        {page==="login" && (
          <AuthPage mode="login" onLogin={handleLogin} onRegister={handleRegister} setPage={navigate}/>
        )}
        {page==="register" && (
          <AuthPage mode="register" onLogin={handleLogin} onRegister={handleRegister} setPage={navigate}/>
        )}
        {page==="dashboard" && auth.currentUser && (
          <Dashboard currentUser={auth.currentUser} store={store} showToast={showToast}/>
        )}
        {page==="dashboard" && !auth.currentUser && (
          <AuthPage mode="login" onLogin={handleLogin} onRegister={handleRegister} setPage={navigate}/>
        )}
        {page==="admin" && auth.currentUser && (auth.currentUser.role==="admin"||auth.currentUser.role==="owner") && (
          <AdminPanel currentUser={auth.currentUser} store={store} showToast={showToast}/>
        )}
        {page==="owner" && auth.currentUser && auth.currentUser.role==="owner" && (
          <OwnerPanel currentUser={auth.currentUser} store={store} showToast={showToast}/>
        )}
      </div>
    </>
  );
                      }
