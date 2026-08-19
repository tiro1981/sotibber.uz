/* =========================================================
   sotibber.uz — Autentifikatsiya yordamchisi (email + parol)
   dashboard/login.html va dashboard/app-init.js tomonidan ishlatiladi.
========================================================= */
(function () {
  'use strict';

  window.SotibberAuth = {
    async getSession() {
      const { data } = await window.sb.auth.getSession();
      return data.session || null;
    },

    async getUser() {
      const session = await this.getSession();
      return session ? session.user : null;
    },

    async signUp({ email, password, fullName, phone, username }) {
      return window.sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || '', phone: phone || '', username: username || '' },
        },
      });
    },

    async signIn({ email, password }) {
      return window.sb.auth.signInWithPassword({ email, password });
    },

    async signOut(redirectTo) {
      // Sessiyani lokal tozalaymiz (tarmoq xatosi bo'lsa ham ishlaydi)
      try { await window.sb.auth.signOut({ scope: 'local' }); } catch (e) { /* baribir davom etamiz */ }
      // Login sahifasiga o'tamiz va uni tarixdan almashtiramiz — shunda
      // "orqaga" tugmasi bosilganda ham dashboardga qaytib bo'lmaydi.
      window.location.replace(redirectTo || 'login.html');
    },

    // Uzbekcha xato xabarlari (Supabase inglizcha xabarlarini tarjima qiladi)
    translateError(err) {
      const msg = (err && err.message) || '';
      if (/already registered|already exists/i.test(msg)) return 'Bu email allaqachon ro\'yxatdan o\'tgan';
      if (/invalid login credentials/i.test(msg)) return 'Email yoki parol noto\'g\'ri';
      if (/email not confirmed/i.test(msg)) return 'Avval emailingizni tasdiqlang';
      if (/password should be at least/i.test(msg)) return 'Parol kamida 6 belgidan iborat bo\'lishi kerak';
      if (/rate limit/i.test(msg)) return 'Juda ko\'p urinish. Birozdan so\'ng qayta urinib ko\'ring';
      if (/invalid email/i.test(msg)) return 'Email manzili noto\'g\'ri';
      return msg || 'Nomalum xatolik yuz berdi';
    },
  };
})();
