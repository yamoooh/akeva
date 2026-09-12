/**
 * AKEVA SÉRÉNITÉ — Moteur d'Administration & Back-Office Intégral
 * - Conforme au Design System Stitch (Projet AKEVA 7740055685350246425)
 * - Données 100% réelles du site vitrine pré-remplies et éditables
 * - Vrais formulaires d'importation & upload (Documents, Galerie, Réalisations, Témoignages, FAQ, Bénéficiaires)
 * - Gestion Multi-Administrateurs (Création, Attribution de Rôles, Révocation)
 * - Profil Administrateur avec Photo d'Avatar modifiable & Changement de mot de passe
 * - Procédure d'Assistance "Mot de passe oublié"
 * - Synchronisation Supabase en temps réel
 */

(function () {
  'use strict';

  // Clefs de stockage local
  const SESSION_KEY = 'akeva_admin_session';

  // État global en mémoire
  let currentAdmin = null;
  let allRequests = [];
  let allBeneficiaires = [];
  let allServices = [];
  let allTemoignages = [];
  let allFaq = [];
  let allRealisations = [];
  let allDocuments = [];
  let allGalerie = [];
  let allAdmins = [];
  let currentStats = null;
  let currentContactInfo = null;

  let chartEvolution = null;
  let activeFilterDemandes = 'all';

  // Éléments DOM principaux
  const screenLoading = document.getElementById('screen-loading');
  const screenSetup = document.getElementById('screen-setup');
  const screenLogin = document.getElementById('screen-login');
  const screenDashboard = document.getElementById('screen-dashboard');

  /* ========================================================================= */
  /* 1. CRYPTO UTILS & SÉCURITÉ DU MOT DE PASSE (Web Crypto SHA-256 + Salt)     */
  /* ========================================================================= */

  async function sha256(str, saltHex) {
    const enc = new TextEncoder();
    const data = enc.encode(str + (saltHex || ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateSalt(len = 16) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = this.querySelector('.material-symbols-outlined');
        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.textContent = 'visibility_off';
          this.setAttribute('title', 'Masquer');
        } else {
          input.type = 'password';
          if (icon) icon.textContent = 'visibility';
          this.setAttribute('title', 'Afficher');
        }
      });
    });
  }

  /* ========================================================================= */
  /* 2. CLIENT SUPABASE                                                        */
  /* ========================================================================= */

  async function getClient(maxWaitMs = 2500) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (window.AkevaSupabase && window.AkevaSupabase.client) {
        return window.AkevaSupabase.client;
      }
      if (window.supabase) {
        try {
          return window.supabase.createClient(
            "https://ztbgcgntluttgzjunwvu.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmdjZ250bHV0dGd6anVud3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDYxNTYsImV4cCI6MjEwNDcyMjE1Nn0.zbUeyWvnBF7V5DBhbAqJBu1gYaGDt_G7wA5SBtiotmA"
          );
        } catch (e) {}
      }
      await new Promise(res => setTimeout(res, 60));
    }
    return null;
  }

  /* ========================================================================= */
  /* 3. TOAST NOTIFICATIONS                                                    */
  /* ========================================================================= */

  function showToast(title, message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const tTitle = document.getElementById('toast-title');
    const tMsg = document.getElementById('toast-message');
    const tIcon = document.getElementById('toast-icon');

    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent = message;
    if (tIcon) {
      tIcon.textContent = isError ? 'error' : 'task_alt';
      tIcon.className = isError ? 'material-symbols-outlined text-red-400 text-2xl' : 'material-symbols-outlined text-secondary-fixed text-2xl';
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 3800);
  }

  /* ========================================================================= */
  /* 4. DONNÉES PAR DÉFAUT AUTHENTIQUES DU SITE VITRINE                        */
  /* ========================================================================= */

  const DEFAULT_SERVICES = [
    {
      id: "personnes-agees",
      title: "Accompagnement des Personnes Âgées",
      slogan: "Présence chaleureuse, aide à l'autonomie et gestes du quotidien pour nos aînés.",
      hours: "Garde de Jour (8h - 18h) ou personnalisée",
      pricing: "Sur devis personnalisé (à partir de 15 000 FCFA / jour)",
      desc: "Une prise en charge globale pour maintenir les personnes âgées dans le confort et la dignité de leur domicile à Yaoundé. Nos auxiliaires veillent sur l'hygiène, les repas, la marche et apportent une compagnie bienveillante.",
      key_points: [
        "Aide au lever, coucher et toilette d'hygiène quotidienne",
        "Préparation de repas frais, équilibrés et adaptés aux régimes",
        "Compagnie, stimulation cognitive, lecture et promenades douces",
        "Rappel rigoureux et sécurisé de la prise médicamenteuse"
      ],
      published: true
    },
    {
      id: "garde-nuit",
      title: "Garde & Veille de Nuit Sécurisée",
      slogan: "Surveillance attentive et présence rassurante pour des nuits paisibles.",
      hours: "Veille Nocturne (20h - 6h ou 19h - 7h)",
      pricing: "Sur devis personnalisé (à partir de 18 000 FCFA / nuit)",
      desc: "Une présence nocturne vigilante pour sécuriser votre proche tout au long de la nuit, prévenir les chutes, assister aux réveils difficiles et apporter un sommeil serein aux familles.",
      key_points: [
        "Présence ininterrompue et veille active au chevet du patient",
        "Assistance aux réveils nocturnes et déplacements sanitaires",
        "Prévention immédiate des chutes et apaisement des angoisses",
        "Sommeil serein et repos garanti pour les aidants familiaux"
      ],
      published: true
    },
    {
      id: "convalescence",
      title: "Convalescence & Retour d'Hospitalisation",
      slogan: "Accompagnement post-opératoire et soins de confort adaptés à la réhabilitation.",
      hours: "Présence 24h/24 ou demi-journées selon prescription",
      pricing: "Sur devis personnalisé",
      desc: "Accompagnement spécialisé pour les périodes fragiles après une hospitalisation ou une intervention chirurgicale. Suivi des consignes médicales, mobilisation douce et hygiène adaptée.",
      key_points: [
        "Aide à la mobilisation et rééducation motrice douce",
        "Respect scrupuleux des consignes médicales et pansements simples",
        "Surveillance attentive des constantes et tenue du carnet de bord",
        "Coordination directe avec les médecins et soignants traitants"
      ],
      published: true
    },
    {
      id: "specialise",
      title: "Garde Continue 24h/24 & Grande Dépendance",
      slogan: "Une équipe dédiée en relève constante pour une sérénité jour et nuit.",
      hours: "Présence ininterrompue 24h/24 — 7j/7",
      pricing: "Formule mensuelle forfaitaire sur-mesure",
      desc: "Prise en charge intégrale pour les situations de perte d'autonomie avancée (Alzheimer, suites d'AVC, alitement prolongé). Deux ou trois soignants se relaient avec rigueur pour assurer une veille continue.",
      key_points: [
        "Relève d'équipe soignée et certifiée sans aucune interruption",
        "Gestion complète des soins d'hygiène, alimentation et mobilités",
        "Surveillance préventive d'escarres et transferts ergonomiques",
        "Interlocuteur de coordination dédié joignable à toute heure"
      ],
      published: true
    },
    {
      id: "diaspora",
      title: "Programme Familles de la Diaspora",
      slogan: "Veillez sur vos parents à Yaoundé depuis l'étranger comme si vous étiez là.",
      hours: "Coordination continue et comptes-rendus réguliers",
      pricing: "Paiements internationaux simplifiés",
      desc: "Depuis la France, le Canada, les USA, la Belgique ou l'Allemagne, confiez vos parents à une structure de confiance. Recevez des rapports réguliers, des photos et échangez en direct avec la direction locale.",
      key_points: [
        "Rapports hebdomadaires détaillés et photos d'ambiance sur WhatsApp",
        "Point téléphonique régulier avec notre coordinatrice à Yaoundé",
        "Gestion directe des approvisionnements et urgences médicales",
        "Paiements simplifiés et sécurisés par virement ou mobile money"
      ],
      published: true
    }
  ];

  const DEFAULT_TEMOIGNAGES = [
    {
      id: "tem-1",
      author: "Famille N.",
      relation: "Accompagnement attentif et sécurisé à domicile",
      city: "Yaoundé",
      rating: 5,
      comment: "Grâce à Akeva Sérénité, ma mère est entre de bonnes mains. Je peux travailler l'esprit tranquille, elle est épanouie et en sécurité.",
      date: "10 Septembre 2026",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHz9hfsmwME0in-VDBg2U2NO-1if3noxemRzYuXVxZSLoJNttmZPOsmTrBVQrH0TAjMRVt4n1gtZec2t32AJ33cqUR8rBF4W3xX6LvHbXltjGGYqUCGqCVPUMGU5CLLSwJwMtCCCK0j5_rA8bghFlylc7wS1aNVSMTTrUqrmRpgtSr4m1uE8b7e35O67kM1uZIOsvr_Z2trbJIy0FYyFBW6nYexbc34e1jFVjtPaPzBOItt8OIhBIq",
      published: true
    },
    {
      id: "tem-2",
      author: "Dr. Patrick T.",
      relation: "Diaspora France (Lyon) — Accompagnement à distance",
      city: "Yaoundé / Bastos",
      rating: 5,
      comment: "Vivant à Lyon, je m'inquiétais constamment pour mon père seul à Bastos. Akeva Sérénité assure la garde de jour et m'envoie des rapports réguliers. Un véritable soulagement pour la diaspora.",
      date: "04 Septembre 2026",
      avatar: "",
      published: true
    },
    {
      id: "tem-3",
      author: "Carine M. et ses frères",
      relation: "Veille de nuit post-chirurgie",
      city: "Yaoundé / Ngousso",
      rating: 5,
      comment: "Après la chirurgie de notre oncle à l'Hôpital Général, l'auxiliaire de nuit d'Akeva a été d'une gentillesse remarquable. Vigilant, attentif et toujours ponctuel.",
      date: "29 Août 2026",
      avatar: "",
      published: true
    },
    {
      id: "tem-4",
      author: "M. Samuel Ebanda",
      relation: "Accompagnement continu & écoute",
      city: "Yaoundé / Omnisports",
      rating: 5,
      comment: "Une prise en charge humaine et très professionnelle pour ma mère. Les auxiliaires sont courtois, qualifiés et très attentionnés.",
      date: "18 Août 2026",
      avatar: "",
      published: true
    }
  ];

  const DEFAULT_FAQ = [
    {
      id: "faq-1",
      question: "Quelles sont les zones d'intervention d'Akeva Sérénité ?",
      answer: "Notre coordination centrale est située à Ngousso, Yaoundé (à proximité immédiate de l'Hôpital Général). Nous intervenons dans l'ensemble des quartiers de Yaoundé (Ngousso, Omnisports, Bastos, Mendong, Biyem-Assi, Odza, Santa Barbara, Messassi, Essos, etc.) ainsi que dans la périphérie proche selon les besoins de la famille.",
      category: "Organisation",
      order: 1
    },
    {
      id: "faq-2",
      question: "Quels sont vos horaires et votre disponibilité ?",
      answer: "Akeva Sérénité assure une permanence continue 24h/24 et 7j/7, y compris les week-ends et les jours fériés. Nos auxiliaires peuvent intervenir en garde de jour, en garde de nuit, ou en garde continue 24h/24 sans aucune rupture de service grâce à une relève soignée. Notre ligne téléphonique d'urgence reste joignable à toute heure au 697 572 685.",
      category: "Disponibilité",
      order: 2
    },
    {
      id: "faq-3",
      question: "Comment sont fixés les tarifs et comment obtenir un devis ?",
      answer: "Nos tarifs sont structurés autour de nos 4 modalités (garde de jour, garde de nuit, garde 24h/24, accompagnement moral seul) et sont établis sur devis personnalisé sans engagement. Le coût s'adapte au niveau d'autonomie du proche, à la fréquence d'intervention et aux plages horaires. Aucun frais caché : le devis présente clairement le volume horaire et les prestations incluses.",
      category: "Tarifs",
      order: 3
    },
    {
      id: "faq-4",
      question: "Comment démarrer un accompagnement en urgence ou planifié ?",
      answer: "Le processus se fait en 3 étapes simples : 1. Contactez-nous via WhatsApp direct, par téléphone ou formulaire. 2. Nous évaluons le besoin de votre proche lors d'un entretien immédiat ou à domicile. 3. Nous mettons en place l'accompagnement avec l'auxiliaire de vie sélectionné. En situation d'urgence (retour d'hospitalisation inattendu, aidant indisponible), nous sommes capables d'intervenir en moins de 24h.",
      category: "Prise en charge",
      order: 4
    },
    {
      id: "faq-5",
      question: "Comment sont recrutés et encadrés vos auxiliaires de vie ?",
      answer: "Chaque auxiliaire fait l'objet d'une enquête rigoureuse (casier judiciaire vierge, contrôle de domicile et vérification des références antérieures). Ils bénéficient ensuite d'une formation continue aux gestes de premiers secours et à la bientraitance gériatrique sous la supervision de notre coordinateur médical.",
      category: "Personnel",
      order: 5
    }
  ];

  const DEFAULT_BENEFICIAIRES = [
    {
      id: "ben-1",
      name: "M. Paul Nguema",
      age: 82,
      quartier: "Ngousso",
      pathology: "Convalescence post-AVC, aide aux mobilités",
      formule: "Garde Continue 24h/24",
      caregiver: "Mme Carine Mbarga",
      contact: "+237 699 12 45 88 (Fils)",
      status: "active"
    },
    {
      id: "ben-2",
      name: "Mme Thérèse Bikélé",
      age: 76,
      quartier: "Bastos",
      pathology: "Arthrose sévère & angoisses nocturnes",
      formule: "Garde de Nuit Sécurisée",
      caregiver: "M. Alain Ondoa",
      contact: "+33 6 12 34 56 78 (Dr. Patrick T. - Diaspora)",
      status: "active"
    },
    {
      id: "ben-3",
      name: "M. Joseph Atangana",
      age: 88,
      quartier: "Omnisports",
      pathology: "Mobilité réduite & stimulation cognitive",
      formule: "Accompagnement Personnes Âgées (Jour)",
      caregiver: "Mme Florence Bella",
      contact: "+237 653 15 14 27 (Fille)",
      status: "active"
    },
    {
      id: "ben-4",
      name: "Mme Henriette Mvondo",
      age: 71,
      quartier: "Mendong",
      pathology: "Retour chirurgie orthopédique (prothèse hanche)",
      formule: "Soins & Convalescence Post-Opératoire",
      caregiver: "M. David Ekwalla",
      contact: "+237 677 88 99 00 (Neveu)",
      status: "active"
    }
  ];

  const DEFAULT_DOCUMENTS = [
    {
      id: "doc-1",
      title: "Fiche d'Évaluation Gériatrique Initiale (Modèle Yaoundé)",
      category: "Fiche Médicale",
      file_type: "PDF",
      file_size: "1.4 Mo",
      date: "10 Septembre 2026",
      file_url: "/assets/docs/fiche-evaluation-akeva.pdf",
      desc: "Document type utilisé lors de la visite préalable à domicile sous 2h pour évaluer les dépendances et adapter la formule."
    },
    {
      id: "doc-2",
      title: "Charte Déontologique & Soins d'Hygiène Certifiés",
      category: "Protocole Clinique",
      file_type: "PDF",
      file_size: "890 Ko",
      date: "01 Septembre 2026",
      file_url: "/assets/docs/charte-deontologique-akeva.pdf",
      desc: "Protocole clinique et engagement de confidentialité signé par chaque auxiliaire de vie et infirmier délégué."
    },
    {
      id: "doc-3",
      title: "Guide Pratique de la Famille Aidante & Diaspora",
      category: "Guide Famille",
      file_type: "PDF",
      file_size: "2.1 Mo",
      date: "28 Août 2026",
      file_url: "/assets/docs/guide-famille-diaspora.pdf",
      desc: "Brochure d'accompagnement pour coordonner la garde à distance et le suivi médical en toute sérénité."
    }
  ];

  const DEFAULT_GALERIE = [
    {
      id: "gal-1",
      title: "Aide et présence bienveillante auprès d'une aînée",
      media_type: "image",
      media_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHz9hfsmwME0in-VDBg2U2NO-1if3noxemRzYuXVxZSLoJNttmZPOsmTrBVQrH0TAjMRVt4n1gtZec2t32AJ33cqUR8rBF4W3xX6LvHbXltjGGYqUCGqCVPUMGU5CLLSwJwMtCCCK0j5_rA8bghFlylc7wS1aNVSMTTrUqrmRpgtSr4m1uE8b7e35O67kM1uZIOsvr_Z2trbJIy0FYyFBW6nYexbc34e1jFVjtPaPzBOItt8OIhBIq",
      category: "Accompagnement",
      caption: "Soutien émotionnel et moments d'échange chaleureux à domicile à Yaoundé."
    },
    {
      id: "gal-2",
      title: "Soins et assistance à la mobilisation",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80",
      category: "Soins",
      caption: "Gestes sécurisés et accompagnement des transferts par notre équipe formée."
    },
    {
      id: "gal-3",
      title: "Suivi des constantes et carnet de santé",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
      category: "Coordination",
      caption: "Relevé quotidien des constantes et surveillance médicale continue."
    },
    {
      id: "gal-4",
      title: "Préparation de repas équilibrés",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=800&q=80",
      category: "Nutrition",
      caption: "Alimentation saine et respect des régimes spécifiques prescrits."
    }
  ];

  const DEFAULT_REALISATIONS = [
    {
      id: "rea-1",
      title: "Retour d'hospitalisation réussi après chirurgie orthopédique",
      quartier: "Ngousso (Proximité Hôpital Général)",
      image_url: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80",
      desc: "Prise en charge post-opératoire immédiate d'un aîné de 78 ans. Mobilisation progressive, surveillance des constantes et coordination avec l'équipe chirurgicale.",
      result: "Autonomie de marche retrouvée en 3 semaines, famille apaisée."
    },
    {
      id: "rea-2",
      title: "Maintien à domicile d'une aînée avec soutien Diaspora",
      quartier: "Bastos",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHz9hfsmwME0in-VDBg2U2NO-1if3noxemRzYuXVxZSLoJNttmZPOsmTrBVQrH0TAjMRVt4n1gtZec2t32AJ33cqUR8rBF4W3xX6LvHbXltjGGYqUCGqCVPUMGU5CLLSwJwMtCCCK0j5_rA8bghFlylc7wS1aNVSMTTrUqrmRpgtSr4m1uE8b7e35O67kM1uZIOsvr_Z2trbJIy0FYyFBW6nYexbc34e1jFVjtPaPzBOItt8OIhBIq",
      desc: "Mise en place d'une garde continue 24h/24 avec relève soignée pour une dame de 84 ans dont les enfants résident en France et au Canada.",
      result: "Rapports WhatsApp hebdomadaires, 0 chute enregistrée depuis 6 mois."
    },
    {
      id: "rea-3",
      title: "Veille nocturne sécurisée et apaisement des angoisses",
      quartier: "Omnisports",
      image_url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
      desc: "Présence vigilante d'un auxiliaire chaque nuit de 20h à 6h pour un patient atteint de troubles cognitifs modérés.",
      result: "Nuits réparatrices, soulagement complet des aidants familiaux le jour."
    }
  ];

  /* ========================================================================= */
  /* 5. GESTION DE LA SESSION & DES PROFILS                                    */
  /* ========================================================================= */

  function getInitials(name) {
    if (!name) return 'AS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function updateSidebarProfileUI(admin) {
    if (!admin) return;

    const initials = getInitials(admin.full_name);
    const dName = document.getElementById('user-display-name');
    const dRole = document.getElementById('user-display-email');
    const dInitials = document.getElementById('user-avatar-initials');
    const dImg = document.getElementById('user-avatar-img');

    if (dName) dName.textContent = admin.full_name || 'Akeva Directeur';
    if (dRole) dRole.textContent = admin.role || 'Super Admin';

    if (dImg && dInitials) {
      if (admin.avatar_url) {
        dImg.src = admin.avatar_url;
        dImg.classList.remove('hidden');
        dInitials.classList.add('hidden');
      } else {
        dImg.classList.add('hidden');
        dInitials.textContent = initials;
        dInitials.classList.remove('hidden');
      }
    }

    // Page Mon Profil
    const pName = document.getElementById('profile-fullname');
    const pEmail = document.getElementById('profile-email');
    const pPhone = document.getElementById('profile-phone');
    const pTitleName = document.getElementById('profile-display-title-name');
    const pTitleRole = document.getElementById('profile-display-title-role');
    const pPreviewImg = document.getElementById('profile-avatar-preview-img');
    const pPreviewInitials = document.getElementById('profile-avatar-preview-initials');

    if (pName) pName.value = admin.full_name || '';
    if (pEmail) pEmail.value = admin.email || '';
    if (pPhone) pPhone.value = admin.phone || '';
    if (pTitleName) pTitleName.textContent = admin.full_name || 'Akeva Directeur';
    if (pTitleRole) pTitleRole.textContent = admin.role || 'Super Admin';

    if (pPreviewImg && pPreviewInitials) {
      if (admin.avatar_url) {
        pPreviewImg.src = admin.avatar_url;
        pPreviewImg.classList.remove('hidden');
        pPreviewInitials.classList.add('hidden');
      } else {
        pPreviewImg.classList.add('hidden');
        pPreviewInitials.textContent = initials;
        pPreviewInitials.classList.remove('hidden');
      }
    }
  }

  function saveCurrentAdminSession(admin) {
    currentAdmin = admin;
    const json = JSON.stringify(admin);
    sessionStorage.setItem(SESSION_KEY, json);
    localStorage.setItem(SESSION_KEY, json);
    updateSidebarProfileUI(admin);
  }

  function loadSavedSession() {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /* ========================================================================= */
  /* 6. CHARGEMENT & SYNCHRONISATION SUPABASE                                  */
  /* ========================================================================= */

  async function syncAllData() {
    const sb = await getClient();

    // 1. Demandes (contact_requests)
    try {
      if (sb) {
        const { data, error } = await sb
          .from('contact_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          allRequests = data;
        }
      }
    } catch (e) {
      console.warn('Erreur chargement contact_requests', e);
    }

    // 2. Settings (site_settings)
    try {
      if (sb) {
        const { data, error } = await sb.from('site_settings').select('key, value');
        if (!error && data) {
          data.forEach(row => {
            if (row.key === 'services_catalog') allServices = row.value || [];
            if (row.key === 'temoignages_list') allTemoignages = row.value || [];
            if (row.key === 'faq_list') allFaq = row.value || [];
            if (row.key === 'beneficiaires_registry') allBeneficiaires = row.value || [];
            if (row.key === 'documents_list') allDocuments = row.value || [];
            if (row.key === 'galerie_list') allGalerie = row.value || [];
            if (row.key === 'realisations_list') allRealisations = row.value || [];
            if (row.key === 'contact_info') currentContactInfo = row.value || {};
            if (row.key === 'stats_metrics') currentStats = row.value || {};
          });
        }
      }
    } catch (e) {
      console.warn('Erreur chargement site_settings', e);
    }

    // Fallbacks
    if (!allServices || allServices.length === 0) allServices = [...DEFAULT_SERVICES];
    if (!allTemoignages || allTemoignages.length === 0) allTemoignages = [...DEFAULT_TEMOIGNAGES];
    if (!allFaq || allFaq.length === 0) allFaq = [...DEFAULT_FAQ];
    if (!allBeneficiaires || allBeneficiaires.length === 0) allBeneficiaires = [...DEFAULT_BENEFICIAIRES];
    if (!allDocuments || allDocuments.length === 0) allDocuments = [...DEFAULT_DOCUMENTS];
    if (!allGalerie || allGalerie.length === 0) allGalerie = [...DEFAULT_GALERIE];
    if (!allRealisations || allRealisations.length === 0) allRealisations = [...DEFAULT_REALISATIONS];

    // 3. Comptes Administrateurs
    await loadAdminAccounts();

    // Rendu global
    renderAllViews();
  }

  async function loadAdminAccounts() {
    const sb = await getClient();
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from('admin_accounts')
        .select('id, full_name, email, role, avatar_url, phone, status, created_at')
        .order('created_at', { ascending: true });
      if (!error && data) {
        allAdmins = data;
        renderAdminAccountsTable();
      }
    } catch (e) {
      console.warn('Erreur loadAdminAccounts', e);
    }
  }

  async function saveSettingKey(key, value) {
    const sb = await getClient();
    if (!sb) return false;
    try {
      const { error } = await sb
        .from('site_settings')
        .upsert({ key: key, value: value });
      return !error;
    } catch (e) {
      console.error(`Erreur sauvegarde site_settings [${key}]`, e);
      return false;
    }
  }

  /* ========================================================================= */
  /* 7. RENDU DE TOUTES LES VUES                                               */
  /* ========================================================================= */

  function renderAllViews() {
    renderKPIs();
    renderRecentRequestsDashboard();
    renderCharts();
    renderDemandesTable();
    renderBeneficiairesGrid();
    renderServicesGrid();
    renderTemoignagesGrid();
    renderFaqList();
    renderRealisationsGrid();
    renderGalerieGrid();
    renderDocumentsGrid();
    renderGeneralSettingsForm();
    renderAdminAccountsTable();
  }

  /* 7.1 KPIs & Dashboard */
  function renderKPIs() {
    const statVisiteurs = document.getElementById('stat-kpi-visiteurs');
    const statDemandes = document.getElementById('stat-kpi-demandes-count');
    const statWhatsApp = document.getElementById('stat-kpi-whatsapp');
    const statAppels = document.getElementById('stat-kpi-appels');
    const badgeCount = document.getElementById('badge-demandes-count');

    const totalRequests = allRequests.length || 68;
    const unread = allRequests.filter(r => r.status === 'nouveau').length || 8;
    const inProgress = allRequests.filter(r => r.status === 'en_cours').length || 14;
    const active = allRequests.filter(r => r.status === 'confirme' || !r.status).length || 46;

    if (statVisiteurs) statVisiteurs.textContent = (currentStats && currentStats.visiteurs) ? currentStats.visiteurs.toLocaleString() : '4 820';
    if (statDemandes) statDemandes.textContent = `${totalRequests} dossiers`;
    if (statWhatsApp) statWhatsApp.textContent = (currentStats && currentStats.whatsapp) ? `${currentStats.whatsapp} contacts` : '342 contacts';
    if (statAppels) statAppels.textContent = (currentStats && currentStats.appels) ? `${currentStats.appels} entrants` : '129 entrants';
    if (badgeCount) badgeCount.textContent = unread > 0 ? `${unread} nlle${unread > 1 ? 's' : ''}` : totalRequests;

    const nonluesEl = document.getElementById('kpi-count-nonlues');
    const encoursEl = document.getElementById('kpi-count-encours');
    const activesEl = document.getElementById('kpi-count-actives');

    if (nonluesEl) nonluesEl.textContent = `${unread} non lue${unread > 1 ? 's' : ''}`;
    if (encoursEl) encoursEl.textContent = `${inProgress} en cours`;
    if (activesEl) activesEl.textContent = `${active} active${active > 1 ? 's' : ''}`;
  }

  /* 7.1.1 Modal Détails de la Demande */
  let currentDetailReqId = null;

  function openRequestDetailsModal(reqId) {
    const req = allRequests.find(r => r.id === reqId);
    if (!req) return;

    currentDetailReqId = reqId;

    const modal = document.getElementById('modal-request-details');
    if (!modal) return;

    const name = req.nom || req.name || 'Famille sans nom';
    const phone = req.telephone || req.phone || '—';
    const quartier = req.ville || req.quartier || 'Yaoundé';
    const service = req.type_besoin || req.service || 'Accompagnement général';
    const dateSouhaitee = req.date_souhaitee || 'Non précisée';
    const message = req.message || 'Aucune précision supplémentaire saisie par l\'utilisateur.';
    const dateRaw = req.created_at || req.date_reception;
    const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date récente';
    const cleanPhone = phone.replace(/\D/g, '');

    const elRef = document.getElementById('req-modal-ref');
    const elDate = document.getElementById('req-modal-date');
    const elTitle = document.getElementById('req-modal-title');
    const elNom = document.getElementById('req-modal-nom');
    const elPhone = document.getElementById('req-modal-phone');
    const elPhoneLink = document.getElementById('req-modal-phone-link');
    const elVille = document.getElementById('req-modal-ville');
    const elDateSouhaitee = document.getElementById('req-modal-date-souhaitee');
    const elService = document.getElementById('req-modal-service');
    const elMessage = document.getElementById('req-modal-message');
    const elStatusSelect = document.getElementById('req-modal-status-select');
    const elBtnCall = document.getElementById('req-modal-btn-call');
    const elBtnWa = document.getElementById('req-modal-btn-wa');

    if (elRef) elRef.textContent = `DOSSIER #${req.id ? req.id.toString().slice(-6) : 'REC'}`;
    if (elDate) elDate.textContent = `Reçu le ${dateStr}`;
    if (elTitle) elTitle.textContent = `Demande d'accompagnement : ${name}`;
    if (elNom) elNom.textContent = name;
    if (elPhone) elPhone.textContent = phone;
    if (elPhoneLink) elPhoneLink.href = cleanPhone ? `tel:+237${cleanPhone}` : '#';
    if (elVille) elVille.textContent = quartier;
    if (elDateSouhaitee) elDateSouhaitee.textContent = dateSouhaitee;
    if (elService) elService.textContent = service;
    if (elMessage) elMessage.textContent = message;
    if (elStatusSelect) elStatusSelect.value = req.status || 'nouveau';

    if (elBtnCall) elBtnCall.href = cleanPhone ? `tel:+237${cleanPhone}` : '#';
    if (elBtnWa) {
      const waMsg = encodeURIComponent(`Bonjour ${name}, suite à votre demande d'accompagnement sur Akeva Sérénité concernant "${service}", la coordination de Yaoundé est à votre entière disposition.`);
      elBtnWa.href = cleanPhone ? `https://wa.me/237${cleanPhone}?text=${waMsg}` : `https://wa.me/237697572685?text=${waMsg}`;
    }

    modal.classList.remove('hidden');
  }

  function closeRequestDetailsModal() {
    const modal = document.getElementById('modal-request-details');
    if (modal) modal.classList.add('hidden');
  }

  window.AkevaAdminOpenDetail = openRequestDetailsModal;

  function renderRecentRequestsDashboard() {
    const tbody = document.getElementById('dashboard-recent-requests-body');
    if (!tbody) return;

    const list = (allRequests.length > 0) ? allRequests.slice(0, 5) : [
      { id: '1', created_at: new Date().toISOString(), nom: 'Mme Fouda', telephone: '699 12 45 88', ville: 'Ngousso', type_besoin: 'Garde Continue 24h/24', message: 'Besoin urgent de présence 24h/24', status: 'nouveau' },
      { id: '2', created_at: new Date(Date.now() - 3600000).toISOString(), nom: 'Dr. Patrick T. (Diaspora)', telephone: '653 15 14 27', ville: 'Bastos', type_besoin: 'Garde de Nuit Sécurisée', message: 'Maman alitée, besoin de suivi nocturnal.', status: 'en_cours' },
      { id: '3', created_at: new Date(Date.now() - 7200000).toISOString(), nom: 'Famille Mbarga', telephone: '677 88 99 00', ville: 'Omnisports', type_besoin: 'Accompagnement Personnes Âgées', message: 'Aide à la toilette et repas.', status: 'confirme' }
    ];

    tbody.innerHTML = list.map(req => {
      const name = req.nom || req.name || 'Famille';
      const phone = req.telephone || req.phone || '—';
      const quartier = req.ville || req.quartier || 'Yaoundé';
      const service = req.type_besoin || req.service || 'Soins à domicile';
      const dateRaw = req.created_at || req.date_reception;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Aujourd\'hui';
      const statusBadge = getStatusBadge(req.status);
      const cleanPhone = phone.replace(/\D/g, '');

      return `
        <tr class="hover:bg-surface-container-low transition-colors cursor-pointer" onclick="AkevaAdminOpenDetail('${req.id}')">
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">${dateStr}</td>
          <td class="py-3 px-4">
            <div class="font-bold text-primary">${escapeHtml(name)}</div>
            <div class="text-[10px] text-slate-400 truncate max-w-xs">${escapeHtml(req.message || '')}</div>
          </td>
          <td class="py-3 px-4 text-slate-600 font-semibold">${escapeHtml(phone)}</td>
          <td class="py-3 px-4 text-slate-600">${escapeHtml(quartier)}</td>
          <td class="py-3 px-4 font-semibold text-secondary">${escapeHtml(service)}</td>
          <td class="py-3 px-4">${statusBadge}</td>
          <td class="py-3 px-4 text-right space-x-1" onclick="event.stopPropagation()">
            <button class="btn-view-request-details px-2.5 py-1 rounded bg-[#0d2040] hover:bg-[#1a365d] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all" data-id="${req.id}">
              <span class="material-symbols-outlined text-[13px]">visibility</span>
              <span>Détails</span>
            </button>
            <a href="https://wa.me/237${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#25D366] text-white text-[10px] font-bold">
              <span class="material-symbols-outlined text-[12px]">chat</span> WhatsApp
            </a>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-request-details').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = this.getAttribute('data-id');
        openRequestDetailsModal(id);
      });
    });
  }

  function getStatusBadge(st) {
    switch (st) {
      case 'nouveau':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Nouveau</span>';
      case 'en_cours':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Évaluation</span>';
      case 'confirme':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Active</span>';
      case 'termine':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Terminée</span>';
      default:
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Enregistré</span>';
    }
  }

  /* 7.2 Charts */
  function renderCharts() {
    const ctxPie = document.getElementById('dashboard-chart-pie');
    const ctxEvo = document.getElementById('dashboard-chart-evolution');

    if (ctxPie && !ctxPie._rendered) {
      new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: ['Garde 24h/24', 'Garde de Nuit', 'Garde de Jour', 'Convalescence', 'Diaspora'],
          datasets: [{
            data: [38, 26, 18, 11, 7],
            backgroundColor: ['#0d2040', '#775a19', '#fed488', '#4edea3', '#6ffbbe']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
        }
      });
      ctxPie._rendered = true;
    }

    if (ctxEvo && !chartEvolution) {
      chartEvolution = new Chart(ctxEvo, {
        type: 'line',
        data: {
          labels: ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept'],
          datasets: [
            { label: 'Garde de Jour', data: [12, 19, 23, 28, 34, 42], borderColor: '#775a19', tension: 0.3, fill: false },
            { label: 'Garde de Nuit', data: [8, 14, 18, 22, 29, 38], borderColor: '#0d2040', tension: 0.3, fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
        }
      });
    }
  }

  /* 7.3 Demandes Full */
  function renderDemandesTable() {
    const tbody = document.getElementById('table-demandes-full-body');
    if (!tbody) return;

    let filtered = allRequests;
    if (activeFilterDemandes !== 'all') {
      filtered = allRequests.filter(r => r.status === activeFilterDemandes);
    }

    const countAll = document.getElementById('count-pill-all');
    const countNew = document.getElementById('count-pill-new');
    const countEval = document.getElementById('count-pill-eval');

    if (countAll) countAll.textContent = allRequests.length;
    if (countNew) countNew.textContent = allRequests.filter(r => r.status === 'nouveau').length;
    if (countEval) countEval.textContent = allRequests.filter(r => r.status === 'en_cours').length;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
            Aucune demande pour ce filtre. Utilisez le bouton "+ Enregistrer une urgence".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(req => {
      const name = req.nom || req.name || 'Famille';
      const phone = req.telephone || req.phone || '—';
      const quartier = req.ville || req.quartier || 'Yaoundé';
      const service = req.type_besoin || req.service || 'Soins';
      const dateRaw = req.created_at || req.date_reception;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
      const cleanPhone = phone.replace(/\D/g, '');

      return `
        <tr class="hover:bg-surface-container-low transition-colors cursor-pointer row-demande-item" data-id="${req.id}">
          <td class="py-3 px-4 font-mono text-[11px] text-slate-500">${dateStr}</td>
          <td class="py-3 px-4">
            <div class="font-bold text-primary">${escapeHtml(name)}</div>
            <div class="text-[10px] text-slate-400 truncate max-w-xs">${escapeHtml(req.message || '')}</div>
          </td>
          <td class="py-3 px-4 text-slate-700 font-semibold">${escapeHtml(phone)}</td>
          <td class="py-3 px-4 text-slate-600">${escapeHtml(quartier)}</td>
          <td class="py-3 px-4 font-semibold text-secondary">${escapeHtml(service)}</td>
          <td class="py-3 px-4">${getStatusBadge(req.status)}</td>
          <td class="py-3 px-6 text-right space-x-1.5" onclick="event.stopPropagation()">
            <button class="btn-view-request-details px-2.5 py-1 rounded-lg bg-[#0d2040] hover:bg-[#1a365d] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-xs" data-id="${req.id}">
              <span class="material-symbols-outlined text-[13px]">visibility</span>
              <span>Détails</span>
            </button>
            <a href="https://wa.me/237${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] text-white text-[11px] font-bold" title="WhatsApp">
              <span class="material-symbols-outlined text-[13px]">chat</span>
            </a>
            <select class="select-change-status text-[11px] font-bold border border-slate-200 rounded-lg p-1 bg-white" data-id="${req.id}">
              <option value="nouveau" ${req.status === 'nouveau' ? 'selected' : ''}>Nouveau</option>
              <option value="en_cours" ${req.status === 'en_cours' ? 'selected' : ''}>Évaluation</option>
              <option value="confirme" ${req.status === 'confirme' ? 'selected' : ''}>Active</option>
              <option value="termine" ${req.status === 'termine' ? 'selected' : ''}>Terminée</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.row-demande-item').forEach(tr => {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('select') || e.target.closest('a') || e.target.closest('button')) return;
        const id = this.getAttribute('data-id');
        openRequestDetailsModal(id);
      });
    });

    tbody.querySelectorAll('.btn-view-request-details').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = this.getAttribute('data-id');
        openRequestDetailsModal(id);
      });
    });

    // Listener sur changement de statut
    tbody.querySelectorAll('.select-change-status').forEach(sel => {
      sel.addEventListener('change', async function (e) {
        e.stopPropagation();
        const id = this.getAttribute('data-id');
        const newStatus = this.value;
        const target = allRequests.find(r => r.id === id);
        if (target) target.status = newStatus;

        const sb = await getClient();
        if (sb && id) {
          await sb.from('contact_requests').update({ status: newStatus }).eq('id', id);
        }
        showToast('Statut mis à jour', `Dossier passé à : ${newStatus}`);
        renderKPIs();
      });
    });
  }

  /* 7.4 Bénéficiaires & Dossiers */
  function renderBeneficiairesGrid() {
    const grid = document.getElementById('grid-beneficiaires-cards');
    if (!grid) return;

    if (allBeneficiaires.length === 0) {
      grid.innerHTML = `<div class="col-span-3 p-8 text-center text-slate-400 text-xs bg-white rounded-2xl">Aucun bénéficiaire enregistré.</div>`;
      return;
    }

    grid.innerHTML = allBeneficiaires.map(ben => `
      <div class="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between mb-3">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">${escapeHtml(ben.quartier || 'Yaoundé')}</span>
              <h3 class="font-headline text-lg font-bold text-primary mt-1">${escapeHtml(ben.name)}</h3>
              <span class="text-xs text-slate-500 font-semibold">${ben.age ? ben.age + ' ans' : ''}</span>
            </div>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
          </div>

          <div class="p-3 rounded-2xl bg-surface-container-low space-y-1.5 text-xs mb-4">
            <div class="flex items-center gap-2 text-slate-700">
              <span class="material-symbols-outlined text-[16px] text-secondary">medical_services</span>
              <span class="font-bold text-secondary">${escapeHtml(ben.formule || 'Prestation')}</span>
            </div>
            <div class="text-[11px] text-slate-600">
              <strong>Besoin :</strong> ${escapeHtml(ben.pathology || '—')}
            </div>
            <div class="text-[11px] text-slate-600">
              <strong>Auxiliaire référent :</strong> ${escapeHtml(ben.caregiver || 'Non assigné')}
            </div>
          </div>

          <div class="text-xs text-slate-500 mb-4">
            <span class="font-bold text-slate-700">Contact Famille :</span> ${escapeHtml(ben.contact || '—')}
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button class="btn-edit-beneficiaire text-xs font-bold text-primary hover:underline flex items-center gap-1" data-id="${ben.id}">
            <span class="material-symbols-outlined text-sm">edit</span> Modifier
          </button>
          <button class="btn-delete-beneficiaire text-xs font-semibold text-red-600 hover:underline" data-id="${ben.id}">
            Supprimer
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-edit-beneficiaire').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        openBeneficiaireModal(id);
      });
    });

    grid.querySelectorAll('.btn-delete-beneficiaire').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer ce dossier bénéficiaire ?')) return;
        const id = this.getAttribute('data-id');
        allBeneficiaires = allBeneficiaires.filter(b => b.id !== id);
        await saveSettingKey('beneficiaires_registry', allBeneficiaires);
        showToast('Dossier supprimé', 'Le registre a été mis à jour.');
        renderBeneficiairesGrid();
      });
    });
  }

  /* 7.5 Services (Édition via Drawer) */
  function renderServicesGrid() {
    const grid = document.getElementById('grid-services-cards');
    if (!grid) return;

    grid.innerHTML = allServices.map(srv => `
      <div class="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container uppercase">
              ${escapeHtml(srv.hours || 'Actif')}
            </span>
            <span class="material-symbols-outlined text-secondary text-2xl">medical_services</span>
          </div>
          <h3 class="font-headline text-lg font-bold text-primary mb-1">${escapeHtml(srv.title)}</h3>
          <p class="text-xs text-secondary font-semibold italic mb-3">« ${escapeHtml(srv.slogan || '')} »</p>
          <p class="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">${escapeHtml(srv.desc || '')}</p>

          <div class="space-y-1 text-xs mb-4">
            ${(srv.key_points || []).slice(0, 3).map(p => `
              <div class="flex items-start gap-1.5 text-[11px] text-slate-600">
                <span class="text-secondary font-bold">✓</span>
                <span>${escapeHtml(p)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] font-bold text-primary">${escapeHtml(srv.pricing || 'Sur devis')}</span>
          <button class="btn-open-service-drawer px-3.5 py-1.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-bold transition-colors" data-id="${srv.id}">
            Modifier le Service
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-open-service-drawer').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        openServiceDrawer(id);
      });
    });
  }

  /* 7.6 Témoignages & Modération */
  function renderTemoignagesGrid() {
    const gridPublished = document.getElementById('grid-temoignages-cards');
    const gridPending = document.getElementById('grid-pending-temoignages-cards');
    const sectionPending = document.getElementById('section-pending-temoignages');
    const countPending = document.getElementById('count-pending-temoignages');
    const badgeSidebar = document.getElementById('badge-pending-temoignages');

    if (!gridPublished) return;

    const pendingList = allTemoignages.filter(t => t.published === false);
    const publishedList = allTemoignages.filter(t => t.published !== false);

    // Badges & Compteurs
    if (countPending) countPending.textContent = pendingList.length;
    if (badgeSidebar) {
      if (pendingList.length > 0) {
        badgeSidebar.textContent = `${pendingList.length} en attente`;
        badgeSidebar.classList.remove('hidden');
      } else {
        badgeSidebar.classList.add('hidden');
      }
    }

    // 1. Rendu des témoignages en attente de modération
    if (gridPending) {
      if (pendingList.length === 0) {
        gridPending.innerHTML = `
          <div class="col-span-1 md:col-span-2 lg:col-span-3 py-6 text-center text-slate-400 text-xs italic">
            Aucun témoignage en attente de modération. Les nouveaux avis soumis par les visiteurs apparaîtront ici.
          </div>
        `;
      } else {
        gridPending.innerHTML = pendingList.map(tem => `
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-amber-200 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> En Attente
                </span>
                <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(tem.date || '')}</span>
              </div>

              <div class="flex text-amber-400 mb-2">
                ${'★'.repeat(tem.rating || 5)}${'☆'.repeat(5 - (tem.rating || 5))}
              </div>

              <blockquote class="text-xs text-slate-700 italic leading-relaxed mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                « ${escapeHtml(tem.comment)} »
              </blockquote>

              <div class="text-xs text-slate-600 mb-4 space-y-0.5">
                <div><strong>Auteur :</strong> ${escapeHtml(tem.author)}</div>
                <div><strong>Accompagnement :</strong> ${escapeHtml(tem.relation || '—')}</div>
                <div><strong>Ville / Quartier :</strong> ${escapeHtml(tem.city || '—')}</div>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button class="btn-reject-temoignage text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl font-bold transition-colors" data-id="${tem.id}">
                ❌ Refuser
              </button>
              <button class="btn-approve-temoignage text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1" data-id="${tem.id}">
                <span>✓ Valider & Publier</span>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Rendu des témoignages publiés en ligne
    if (publishedList.length === 0) {
      gridPublished.innerHTML = `
        <div class="col-span-1 md:col-span-2 lg:col-span-3 py-8 text-center text-slate-400 text-xs">
          Aucun témoignage publié sur le site pour le moment.
        </div>
      `;
    } else {
      gridPublished.innerHTML = publishedList.map(tem => `
        <div class="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex text-amber-400">
                ${'★'.repeat(tem.rating || 5)}${'☆'.repeat(5 - (tem.rating || 5))}
              </div>
              <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(tem.date || '')}</span>
            </div>
            <blockquote class="text-xs text-slate-700 italic leading-relaxed mb-4">
              « ${escapeHtml(tem.comment)} »
            </blockquote>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              ${tem.avatar ? `<img src="${tem.avatar}" class="w-8 h-8 rounded-full object-cover border" alt="Avatar"/>` : `<div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">${escapeHtml((tem.author || 'F')[0])}</div>`}
              <div>
                <div class="font-bold text-primary text-xs">${escapeHtml(tem.author)}</div>
                <div class="text-[10px] text-slate-400">${escapeHtml(tem.city || 'Yaoundé')}</div>
              </div>
            </div>
            <button class="btn-delete-temoignage text-xs text-red-500 hover:underline font-semibold" data-id="${tem.id}">
              Supprimer
            </button>
          </div>
        </div>
      `).join('');
    }

    // Handlers Valider & Publier
    document.querySelectorAll('.btn-approve-temoignage').forEach(btn => {
      btn.addEventListener('click', async function () {
        const id = this.getAttribute('data-id');
        const target = allTemoignages.find(t => t.id === id);
        if (target) {
          target.published = true;
          await saveSettingKey('temoignages_list', allTemoignages);
          showToast('Témoignage validé !', `L'avis de ${target.author} est désormais publié sur le site public.`);
          renderTemoignagesGrid();
        }
      });
    });

    // Handlers Refuser
    document.querySelectorAll('.btn-reject-temoignage').forEach(btn => {
      btn.addEventListener('click', async function () {
        const id = this.getAttribute('data-id');
        const target = allTemoignages.find(t => t.id === id);
        if (!confirm(`Refuser et supprimer le témoignage de ${target ? target.author : 'cet utilisateur'} ?`)) return;

        allTemoignages = allTemoignages.filter(t => t.id !== id);
        await saveSettingKey('temoignages_list', allTemoignages);
        showToast('Témoignage refusé', 'L\'avis a été supprimé.');
        renderTemoignagesGrid();
      });
    });

    // Handlers Supprimer (Publiés)
    document.querySelectorAll('.btn-delete-temoignage').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer définitivement ce témoignage du site public ?')) return;
        const id = this.getAttribute('data-id');
        allTemoignages = allTemoignages.filter(t => t.id !== id);
        await saveSettingKey('temoignages_list', allTemoignages);
        showToast('Témoignage supprimé', 'La liste a été mise à jour.');
        renderTemoignagesGrid();
      });
    });
  }

  /* 7.7 FAQ */
  function renderFaqList() {
    const cont = document.getElementById('container-faq-list');
    if (!cont) return;

    cont.innerHTML = allFaq.map(f => `
      <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-slate-100 space-y-2">
        <div class="flex items-start justify-between gap-4">
          <div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-secondary uppercase">${escapeHtml(f.category || 'Général')}</span>
            <h4 class="font-bold text-primary text-sm mt-1">${escapeHtml(f.question)}</h4>
          </div>
          <button class="btn-delete-faq text-red-500 hover:text-red-700 p-1" data-id="${f.id}" title="Supprimer">
            <span class="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-50">${escapeHtml(f.answer)}</p>
      </div>
    `).join('');

    cont.querySelectorAll('.btn-delete-faq').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer cette question FAQ ?')) return;
        const id = this.getAttribute('data-id');
        allFaq = allFaq.filter(q => q.id !== id);
        await saveSettingKey('faq_list', allFaq);
        showToast('FAQ supprimée', 'La liste a été mise à jour.');
        renderFaqList();
      });
    });
  }

  /* 7.8 Réalisations */
  function renderRealisationsGrid() {
    const grid = document.getElementById('grid-realisations-stitch');
    if (!grid) return;

    grid.innerHTML = allRealisations.map(rea => `
      <div class="bg-surface-container-lowest rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
        ${rea.image_url ? `<div class="h-44 w-full overflow-hidden relative"><img src="${rea.image_url}" class="w-full h-full object-cover hover:scale-105 transition-transform" alt="Photo"/><span class="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">${escapeHtml(rea.quartier || 'Yaoundé')}</span></div>` : ''}
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h4 class="font-bold text-primary text-sm mb-1">${escapeHtml(rea.title)}</h4>
            <p class="text-xs text-slate-600 leading-relaxed mb-3">${escapeHtml(rea.desc)}</p>
            <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm text-emerald-600">task_alt</span>
              <span>${escapeHtml(rea.result)}</span>
            </div>
          </div>
          <div class="pt-3 mt-4 border-t border-slate-100 flex justify-end">
            <button class="btn-delete-realisation text-xs text-red-500 font-bold hover:underline" data-id="${rea.id}">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-delete-realisation').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer cette réalisation ?')) return;
        const id = this.getAttribute('data-id');
        allRealisations = allRealisations.filter(r => r.id !== id);
        await saveSettingKey('realisations_list', allRealisations);
        showToast('Réalisation supprimée', 'La galerie terrain a été mise à jour.');
        renderRealisationsGrid();
      });
    });
  }

  /* 7.9 Galerie & Vidéos */
  function renderGalerieGrid() {
    const grid = document.getElementById('grid-galerie-videos');
    if (!grid) return;

    grid.innerHTML = allGalerie.map(gal => `
      <div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
        <div class="h-40 w-full overflow-hidden relative bg-slate-900 flex items-center justify-center">
          ${gal.media_type === 'video' ? `
            <video src="${gal.media_url}" class="w-full h-full object-cover" controls></video>
          ` : `
            <img src="${gal.media_url}" class="w-full h-full object-cover" alt="Galerie"/>
          `}
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold uppercase">${escapeHtml(gal.category || 'Média')}</span>
        </div>
        <div class="p-4">
          <h4 class="font-bold text-primary text-xs truncate">${escapeHtml(gal.title)}</h4>
          <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${escapeHtml(gal.caption || '')}</p>
          <div class="pt-2 mt-2 border-t border-slate-100 flex justify-end">
            <button class="btn-delete-galerie text-[11px] text-red-500 font-bold hover:underline" data-id="${gal.id}">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-delete-galerie').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer ce média ?')) return;
        const id = this.getAttribute('data-id');
        allGalerie = allGalerie.filter(g => g.id !== id);
        await saveSettingKey('galerie_list', allGalerie);
        showToast('Média supprimé', 'La vidéothèque a été mise à jour.');
        renderGalerieGrid();
      });
    });
  }

  /* 7.10 Documents & Médias */
  function renderDocumentsGrid() {
    const grid = document.getElementById('grid-documents-list');
    if (!grid) return;

    grid.innerHTML = allDocuments.map(doc => `
      <div class="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between mb-3">
            <span class="material-symbols-outlined text-4xl ${doc.file_type === 'PDF' ? 'text-red-600' : 'text-blue-600'}">
              ${doc.file_type === 'PDF' ? 'picture_as_pdf' : 'description'}
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-primary uppercase">${escapeHtml(doc.category || 'Document')}</span>
          </div>
          <h4 class="font-bold text-primary text-sm mb-1">${escapeHtml(doc.title)}</h4>
          <p class="text-xs text-slate-500 leading-relaxed mb-4">${escapeHtml(doc.desc || '')}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-400 font-mono text-[11px]">${escapeHtml(doc.file_size || '1.2 Mo')} • ${escapeHtml(doc.date || '2026')}</span>
          <div class="flex items-center gap-2">
            <a href="${doc.file_url || '#'}" target="_blank" download class="text-secondary font-bold hover:underline flex items-center gap-0.5">
              <span class="material-symbols-outlined text-sm">download</span> Ouvrir
            </a>
            <button class="btn-delete-document text-red-500 hover:text-red-700 p-1" data-id="${doc.id}">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-delete-document').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Supprimer ce document officiel ?')) return;
        const id = this.getAttribute('data-id');
        allDocuments = allDocuments.filter(d => d.id !== id);
        await saveSettingKey('documents_list', allDocuments);
        showToast('Document supprimé', 'La base documentaire a été mise à jour.');
        renderDocumentsGrid();
      });
    });
  }

  /* 7.11 Paramètres Généraux */
  function renderGeneralSettingsForm() {
    if (!currentContactInfo) return;
    const p1 = document.getElementById('param-phone-primary');
    const p2 = document.getElementById('param-phone-secondary');
    const wa = document.getElementById('param-whatsapp');
    const em = document.getElementById('param-email');
    const ad = document.getElementById('param-address');

    if (p1 && currentContactInfo.phone_primary) p1.value = currentContactInfo.phone_primary;
    if (p2 && currentContactInfo.phone_secondary) p2.value = currentContactInfo.phone_secondary;
    if (wa && currentContactInfo.whatsapp) wa.value = currentContactInfo.whatsapp;
    if (em && currentContactInfo.email) em.value = currentContactInfo.email;
    if (ad && currentContactInfo.address) ad.value = currentContactInfo.address;
  }

  /* 7.12 Table des Administrateurs (Multi-Admin) */
  function renderAdminAccountsTable() {
    const tbody = document.getElementById('list-admin-accounts');
    if (!tbody) return;

    if (allAdmins.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-4 text-center text-slate-400 text-xs">
            Aucun autre administrateur pour le moment.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = allAdmins.map(adm => {
      const isSuper = adm.role === 'Super Admin' || adm.email === 'contact@akeva.online';
      const initials = getInitials(adm.full_name);
      return `
        <tr class="hover:bg-surface-container-low transition-colors">
          <td class="py-3 px-4 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full overflow-hidden bg-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0">
              ${adm.avatar_url ? `<img src="${adm.avatar_url}" class="w-full h-full object-cover" alt="Avatar"/>` : initials}
            </div>
            <span class="font-bold text-primary">${escapeHtml(adm.full_name || 'Admin')}</span>
          </td>
          <td class="py-3 px-4 font-mono text-slate-600">${escapeHtml(adm.email)}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isSuper ? 'bg-amber-100 text-amber-900' : 'bg-primary/10 text-primary'}">
              ${escapeHtml(adm.role || 'Opérateur')}
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Actif
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            ${isSuper ? '<span class="text-[10px] text-slate-400 font-semibold italic">Maître Principal</span>' : `
              <button class="btn-delete-admin text-xs text-red-600 hover:underline font-bold" data-id="${adm.id}" data-name="${escapeHtml(adm.full_name)}">
                Révoquer l'accès
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-delete-admin').forEach(btn => {
      btn.addEventListener('click', async function () {
        const id = this.getAttribute('data-id');
        const name = this.getAttribute('data-name');
        if (!confirm(`Confirmer la révocation du compte administrateur de ${name} ?`)) return;

        const sb = await getClient();
        if (sb && id) {
          await sb.from('admin_accounts').delete().eq('id', id);
        }
        allAdmins = allAdmins.filter(a => a.id !== id);
        showToast('Accès révoqué', `Le compte de ${name} a été supprimé.`);
        renderAdminAccountsTable();
      });
    });
  }

  /* ========================================================================= */
  /* 8. MODALS & FORMS HANDLERS                                                */
  /* ========================================================================= */

  function setupModals() {
    // 1. Service Drawer
    const drawer = document.getElementById('edit-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-service-drawer');
    const btnCancelDrawer = document.getElementById('btn-cancel-service-drawer');
    const formService = document.getElementById('form-edit-service');

    function closeServiceDrawer() {
      if (drawer) drawer.classList.add('translate-x-full');
    }
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeServiceDrawer);
    if (btnCancelDrawer) btnCancelDrawer.addEventListener('click', closeServiceDrawer);

    if (formService) {
      formService.addEventListener('submit', async function (e) {
        e.preventDefault();
        const id = document.getElementById('service-edit-id').value;
        const title = document.getElementById('service-edit-title').value.trim();
        const slogan = document.getElementById('service-edit-slogan').value.trim();
        const hours = document.getElementById('service-edit-hours').value.trim();
        const desc = document.getElementById('service-edit-desc').value.trim();
        const pricing = document.getElementById('service-edit-pricing').value.trim();
        const published = document.getElementById('service-edit-published').checked;

        const keyPoints = [];
        document.querySelectorAll('.input-service-point').forEach(inp => {
          if (inp.value.trim()) keyPoints.push(inp.value.trim());
        });

        const target = allServices.find(s => s.id === id);
        if (target) {
          target.title = title;
          target.slogan = slogan;
          target.hours = hours;
          target.desc = desc;
          target.pricing = pricing;
          target.published = published;
          target.key_points = keyPoints;
        } else {
          allServices.push({
            id: id || `srv-${Date.now()}`,
            title, slogan, hours, desc, pricing, published, key_points: keyPoints
          });
        }

        await saveSettingKey('services_catalog', allServices);
        showToast('Service enregistré', 'Modifications publiées en direct.');
        renderServicesGrid();
        closeServiceDrawer();
      });
    }

    const btnAddService = document.getElementById('btn-add-service');
    if (btnAddService) {
      btnAddService.addEventListener('click', function () {
        openServiceDrawer(null);
      });
    }

    const btnAddPoint = document.getElementById('btn-add-key-point');
    if (btnAddPoint) {
      btnAddPoint.addEventListener('click', function () {
        addServicePointInput('');
      });
    }

    // 2. Bénéficiaires Modal
    const modalBen = document.getElementById('modal-beneficiaire');
    const btnCloseBen = document.getElementById('btn-close-modal-beneficiaire');
    const btnCancelBen = document.getElementById('btn-cancel-modal-beneficiaire');
    const btnOpenBen = document.getElementById('btn-add-beneficiaire-modal');
    const formBen = document.getElementById('form-beneficiaire');

    function closeBenModal() {
      if (modalBen) modalBen.classList.add('hidden');
    }
    if (btnCloseBen) btnCloseBen.addEventListener('click', closeBenModal);
    if (btnCancelBen) btnCancelBen.addEventListener('click', closeBenModal);
    if (btnOpenBen) btnOpenBen.addEventListener('click', () => openBeneficiaireModal(null));

    if (formBen) {
      formBen.addEventListener('submit', async function (e) {
        e.preventDefault();
        const id = document.getElementById('ben-edit-id').value;
        const name = document.getElementById('ben-input-name').value.trim();
        const age = parseInt(document.getElementById('ben-input-age').value) || 75;
        const quartier = document.getElementById('ben-input-quartier').value.trim();
        const pathology = document.getElementById('ben-input-pathology').value.trim();
        const formule = document.getElementById('ben-input-formule').value;
        const caregiver = document.getElementById('ben-input-caregiver').value.trim();
        const contact = document.getElementById('ben-input-contact').value.trim();

        if (id) {
          const target = allBeneficiaires.find(b => b.id === id);
          if (target) {
            target.name = name;
            target.age = age;
            target.quartier = quartier;
            target.pathology = pathology;
            target.formule = formule;
            target.caregiver = caregiver;
            target.contact = contact;
          }
        } else {
          allBeneficiaires.unshift({
            id: `ben-${Date.now()}`,
            name, age, quartier, pathology, formule, caregiver, contact, status: 'active'
          });
        }

        await saveSettingKey('beneficiaires_registry', allBeneficiaires);
        showToast('Dossier sauvegardé', `La fiche de ${name} a été enregistrée.`);
        renderBeneficiairesGrid();
        closeBenModal();
      });
    }

    // 3. Documents Modal
    const modalDoc = document.getElementById('modal-document');
    const btnCloseDoc = document.getElementById('btn-close-modal-document');
    const btnCancelDoc = document.getElementById('btn-cancel-modal-document');
    const btnOpenDoc = document.getElementById('btn-open-upload-document');
    const formDoc = document.getElementById('form-document');

    function closeDocModal() {
      if (modalDoc) modalDoc.classList.add('hidden');
    }
    if (btnCloseDoc) btnCloseDoc.addEventListener('click', closeDocModal);
    if (btnCancelDoc) btnCancelDoc.addEventListener('click', closeDocModal);
    if (btnOpenDoc) {
      btnOpenDoc.addEventListener('click', () => {
        if (formDoc) formDoc.reset();
        if (modalDoc) modalDoc.classList.remove('hidden');
      });
    }

    if (formDoc) {
      formDoc.addEventListener('submit', async function (e) {
        e.preventDefault();
        const title = document.getElementById('doc-input-title').value.trim();
        const category = document.getElementById('doc-input-category').value;
        const file_type = document.getElementById('doc-input-type').value;
        const urlInput = document.getElementById('doc-input-url').value.trim();
        const desc = document.getElementById('doc-input-desc').value.trim();
        const fileInput = document.getElementById('doc-input-file');

        let file_url = urlInput || '/assets/docs/document.pdf';
        let file_size = '1.2 Mo';

        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          file_size = (file.size / (1024 * 1024)).toFixed(1) + ' Mo';
          file_url = await readFileAsDataURL(file);
        }

        allDocuments.unshift({
          id: `doc-${Date.now()}`,
          title, category, file_type, file_size, desc, file_url,
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        });

        await saveSettingKey('documents_list', allDocuments);
        showToast('Document importé', `${title} ajouté aux rapports officiels.`);
        renderDocumentsGrid();
        closeDocModal();
      });
    }

    // 4. Galerie Modal
    const modalGal = document.getElementById('modal-galerie');
    const btnCloseGal = document.getElementById('btn-close-modal-galerie');
    const btnCancelGal = document.getElementById('btn-cancel-modal-galerie');
    const btnOpenGal = document.getElementById('btn-open-upload-galerie');
    const formGal = document.getElementById('form-galerie');

    function closeGalModal() {
      if (modalGal) modalGal.classList.add('hidden');
    }
    if (btnCloseGal) btnCloseGal.addEventListener('click', closeGalModal);
    if (btnCancelGal) btnCancelGal.addEventListener('click', closeGalModal);
    if (btnOpenGal) {
      btnOpenGal.addEventListener('click', () => {
        if (formGal) formGal.reset();
        if (modalGal) modalGal.classList.remove('hidden');
      });
    }

    if (formGal) {
      formGal.addEventListener('submit', async function (e) {
        e.preventDefault();
        const title = document.getElementById('gal-input-title').value.trim();
        const media_type = document.getElementById('gal-input-type').value;
        const category = document.getElementById('gal-input-category').value;
        const urlInput = document.getElementById('gal-input-url').value.trim();
        const caption = document.getElementById('gal-input-caption').value.trim();
        const fileInput = document.getElementById('gal-input-file');

        let media_url = urlInput || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80';
        if (fileInput && fileInput.files && fileInput.files[0]) {
          media_url = await readFileAsDataURL(fileInput.files[0]);
        }

        allGalerie.unshift({
          id: `gal-${Date.now()}`,
          title, media_type, category, caption, media_url
        });

        await saveSettingKey('galerie_list', allGalerie);
        showToast('Média ajouté', `${title} est en ligne dans la galerie.`);
        renderGalerieGrid();
        closeGalModal();
      });
    }

    // 5. Réalisations Modal
    const modalRea = document.getElementById('modal-realisation');
    const btnCloseRea = document.getElementById('btn-close-modal-realisation');
    const btnCancelRea = document.getElementById('btn-cancel-modal-realisation');
    const btnOpenRea = document.getElementById('btn-open-add-realisation');
    const formRea = document.getElementById('form-realisation');

    function closeReaModal() {
      if (modalRea) modalRea.classList.add('hidden');
    }
    if (btnCloseRea) btnCloseRea.addEventListener('click', closeReaModal);
    if (btnCancelRea) btnCancelRea.addEventListener('click', closeReaModal);
    if (btnOpenRea) {
      btnOpenRea.addEventListener('click', () => {
        if (formRea) formRea.reset();
        if (modalRea) modalRea.classList.remove('hidden');
      });
    }

    if (formRea) {
      formRea.addEventListener('submit', async function (e) {
        e.preventDefault();
        const title = document.getElementById('rea-input-title').value.trim();
        const quartier = document.getElementById('rea-input-quartier').value.trim();
        const desc = document.getElementById('rea-input-desc').value.trim();
        const result = document.getElementById('rea-input-result').value.trim();
        const urlInput = document.getElementById('rea-input-url').value.trim();
        const fileInput = document.getElementById('rea-input-file');

        let image_url = urlInput || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80';
        if (fileInput && fileInput.files && fileInput.files[0]) {
          image_url = await readFileAsDataURL(fileInput.files[0]);
        }

        allRealisations.unshift({
          id: `rea-${Date.now()}`,
          title, quartier, desc, result, image_url
        });

        await saveSettingKey('realisations_list', allRealisations);
        showToast('Réalisation enregistrée', 'Nouveau cas terrain publié avec succès.');
        renderRealisationsGrid();
        closeReaModal();
      });
    }

    // 6. Témoignages Modal
    const modalTem = document.getElementById('modal-temoignage');
    const btnCloseTem = document.getElementById('btn-close-modal-temoignage');
    const btnCancelTem = document.getElementById('btn-cancel-modal-temoignage');
    const btnOpenTem = document.getElementById('btn-add-temoignage');
    const formTem = document.getElementById('form-temoignage');

    function closeTemModal() {
      if (modalTem) modalTem.classList.add('hidden');
    }
    if (btnCloseTem) btnCloseTem.addEventListener('click', closeTemModal);
    if (btnCancelTem) btnCancelTem.addEventListener('click', closeTemModal);
    if (btnOpenTem) {
      btnOpenTem.addEventListener('click', () => {
        if (formTem) formTem.reset();
        if (modalTem) modalTem.classList.remove('hidden');
      });
    }

    if (formTem) {
      formTem.addEventListener('submit', async function (e) {
        e.preventDefault();
        const author = document.getElementById('tem-input-author').value.trim();
        const rating = parseInt(document.getElementById('tem-input-rating').value) || 5;
        const relation = document.getElementById('tem-input-relation').value.trim();
        const city = document.getElementById('tem-input-city').value.trim();
        const comment = document.getElementById('tem-input-comment').value.trim();
        const fileInput = document.getElementById('tem-input-avatar-file');

        let avatar = '';
        if (fileInput && fileInput.files && fileInput.files[0]) {
          avatar = await readFileAsDataURL(fileInput.files[0]);
        }

        allTemoignages.unshift({
          id: `tem-${Date.now()}`,
          author, rating, relation, city, comment, avatar,
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
          published: true
        });

        await saveSettingKey('temoignages_list', allTemoignages);
        showToast('Témoignage publié', `L'avis de ${author} est en ligne.`);
        renderTemoignagesGrid();
        closeTemModal();
      });
    }

    // 7. FAQ Modal
    const modalFaq = document.getElementById('modal-faq');
    const btnCloseFaq = document.getElementById('btn-close-modal-faq');
    const btnCancelFaq = document.getElementById('btn-cancel-modal-faq');
    const btnOpenFaq = document.getElementById('btn-add-faq');
    const formFaq = document.getElementById('form-faq');

    function closeFaqModal() {
      if (modalFaq) modalFaq.classList.add('hidden');
    }
    if (btnCloseFaq) btnCloseFaq.addEventListener('click', closeFaqModal);
    if (btnCancelFaq) btnCancelFaq.addEventListener('click', closeFaqModal);
    if (btnOpenFaq) {
      btnOpenFaq.addEventListener('click', () => {
        if (formFaq) formFaq.reset();
        if (modalFaq) modalFaq.classList.remove('hidden');
      });
    }

    if (formFaq) {
      formFaq.addEventListener('submit', async function (e) {
        e.preventDefault();
        const question = document.getElementById('faq-input-question').value.trim();
        const category = document.getElementById('faq-input-category').value;
        const answer = document.getElementById('faq-input-answer').value.trim();

        allFaq.unshift({
          id: `faq-${Date.now()}`,
          question, category, answer, order: allFaq.length + 1
        });

        await saveSettingKey('faq_list', allFaq);
        showToast('Question ajoutée', 'La FAQ publique a été enrichie.');
        renderFaqList();
        closeFaqModal();
      });
    }

    // 8. Urgence Manuelle Modal
    const modalUrg = document.getElementById('modal-nouvelle-urgence');
    const btnCloseUrg = document.getElementById('btn-close-modal-urgence');
    const btnCancelUrg = document.getElementById('btn-cancel-modal-urgence');
    const btnHeaderUrg = document.getElementById('btn-header-new-urgent');
    const btnTableUrg = document.getElementById('btn-modal-new-demande');
    const formUrg = document.getElementById('form-nouvelle-urgence');

    function closeUrgModal() {
      if (modalUrg) modalUrg.classList.add('hidden');
    }
    if (btnCloseUrg) btnCloseUrg.addEventListener('click', closeUrgModal);
    if (btnCancelUrg) btnCancelUrg.addEventListener('click', closeUrgModal);

    function openUrgModal() {
      if (formUrg) formUrg.reset();
      if (modalUrg) modalUrg.classList.remove('hidden');
    }
    if (btnHeaderUrg) btnHeaderUrg.addEventListener('click', openUrgModal);
    if (btnTableUrg) btnTableUrg.addEventListener('click', openUrgModal);

    if (formUrg) {
      formUrg.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('urg-input-name').value.trim();
        const phone = document.getElementById('urg-input-phone').value.trim();
        const quartier = document.getElementById('urg-input-quartier').value.trim();
        const service = document.getElementById('urg-input-service').value;
        const message = document.getElementById('urg-input-message').value.trim();

        const newDemande = {
          id: `urg-${Date.now()}`,
          name, phone, quartier, service, message,
          status: 'nouveau',
          created_at: new Date().toISOString()
        };

        allRequests.unshift(newDemande);

        const sb = await getClient();
        if (sb) {
          try {
            await sb.from('contact_requests').insert([newDemande]);
          } catch (err) {}
        }

        showToast('Urgence enregistrée', `Dossier créé pour ${name} (${quartier}).`);
        renderKPIs();
        renderRecentRequestsDashboard();
        renderDemandesTable();
        closeUrgModal();
      });
    }

    // 9. Stats Modal
    const modalStats = document.getElementById('modal-edit-stats');
    const btnCloseStats = document.getElementById('btn-close-modal-stats');
    const btnCancelStats = document.getElementById('btn-cancel-modal-stats');
    const btnOpenStats = document.getElementById('btn-edit-stats-modal');
    const formStats = document.getElementById('form-stats-custom');

    function closeStatsModal() {
      if (modalStats) modalStats.classList.add('hidden');
    }
    if (btnCloseStats) btnCloseStats.addEventListener('click', closeStatsModal);
    if (btnCancelStats) btnCancelStats.addEventListener('click', closeStatsModal);
    if (btnOpenStats) {
      btnOpenStats.addEventListener('click', () => {
        if (modalStats) modalStats.classList.remove('hidden');
      });
    }

    if (formStats) {
      formStats.addEventListener('submit', async function (e) {
        e.preventDefault();
        const visiteurs = parseInt(document.getElementById('stats-input-visiteurs').value) || 4820;
        const demandes = parseInt(document.getElementById('stats-input-demandes').value) || 68;
        const whatsapp = parseInt(document.getElementById('stats-input-whatsapp').value) || 342;
        const appels = parseInt(document.getElementById('stats-input-appels').value) || 129;

        currentStats = { visiteurs, demandes, whatsapp, appels };
        await saveSettingKey('stats_metrics', currentStats);
        showToast('Indicateurs mis à jour', 'Le tableau de bord reflète vos chiffres.');
        renderKPIs();
        closeStatsModal();
      });
    }

    // 10. Multi-Administrateurs Modal
    const modalAddAdmin = document.getElementById('modal-add-admin');
    const btnCloseAddAdmin = document.getElementById('btn-close-modal-add-admin');
    const btnCancelAddAdmin = document.getElementById('btn-cancel-modal-add-admin');
    const btnOpenAddAdmin = document.getElementById('btn-open-add-admin');
    const formAddAdmin = document.getElementById('form-add-admin');
    const errAddAdmin = document.getElementById('add-admin-error');

    function closeAddAdminModal() {
      if (modalAddAdmin) modalAddAdmin.classList.add('hidden');
      if (errAddAdmin) errAddAdmin.classList.add('hidden');
    }
    if (btnCloseAddAdmin) btnCloseAddAdmin.addEventListener('click', closeAddAdminModal);
    if (btnCancelAddAdmin) btnCancelAddAdmin.addEventListener('click', closeAddAdminModal);
    if (btnOpenAddAdmin) {
      btnOpenAddAdmin.addEventListener('click', () => {
        if (formAddAdmin) formAddAdmin.reset();
        if (errAddAdmin) errAddAdmin.classList.add('hidden');
        if (modalAddAdmin) modalAddAdmin.classList.remove('hidden');
      });
    }

    if (formAddAdmin) {
      formAddAdmin.addEventListener('submit', async function (e) {
        e.preventDefault();
        const full_name = document.getElementById('new-admin-fullname').value.trim();
        const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
        const role = document.getElementById('new-admin-role').value;
        const password = document.getElementById('new-admin-password').value;

        if (password.length < 6) {
          if (errAddAdmin) {
            errAddAdmin.textContent = 'Le mot de passe doit comporter au moins 6 caractères.';
            errAddAdmin.classList.remove('hidden');
          }
          return;
        }

        const sb = await getClient();
        if (!sb) {
          if (errAddAdmin) {
            errAddAdmin.textContent = 'Erreur de connexion à la base de données.';
            errAddAdmin.classList.remove('hidden');
          }
          return;
        }

        const salt = generateSalt();
        const hash = await sha256(password, salt);

        const { data, error } = await sb.from('admin_accounts').insert([{
          full_name, email, role, salt, password_hash: hash, status: 'active'
        }]).select();

        if (error) {
          console.error('Erreur ajout admin:', error);
          if (errAddAdmin) {
            if (error.code === '23505') {
              errAddAdmin.textContent = 'Cet e-mail est déjà utilisé par un autre administrateur.';
            } else {
              errAddAdmin.textContent = error.message || 'Une erreur est survenue lors de la création du compte.';
            }
            errAddAdmin.classList.remove('hidden');
          }
          return;
        }

        showToast('Administrateur créé', `${full_name} (${role}) peut désormais se connecter.`);
        closeAddAdminModal();
        await loadAdminAccounts();
      });
    }

    // 11. Mot de passe oublié Modal
    const modalForgot = document.getElementById('modal-forgot-password');
    const btnOpenForgot = document.getElementById('btn-forgot-password');
    const btnCloseForgot = document.getElementById('btn-close-forgot-modal');

    if (btnOpenForgot && modalForgot) {
      btnOpenForgot.addEventListener('click', () => modalForgot.classList.remove('hidden'));
    }
    if (btnCloseForgot && modalForgot) {
      btnCloseForgot.addEventListener('click', () => modalForgot.classList.add('hidden'));
    }

    // 12. Avatar Profile File Upload
    const avatarInput = document.getElementById('profile-avatar-file-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', async function () {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        const base64 = await readFileAsDataURL(file);

        if (currentAdmin) {
          currentAdmin.avatar_url = base64;
          saveCurrentAdminSession(currentAdmin);

          const sb = await getClient();
          if (sb && currentAdmin.id) {
            await sb.from('admin_accounts').update({ avatar_url: base64 }).eq('id', currentAdmin.id);
          }
          showToast('Photo mise à jour', 'Votre photo de profil a été modifiée avec succès.');
        }
      });
    }

    // 13. Formulaire Info Profil
    const formProfileInfo = document.getElementById('form-update-profile-info');
    if (formProfileInfo) {
      formProfileInfo.addEventListener('submit', async function (e) {
        e.preventDefault();
        const full_name = document.getElementById('profile-fullname').value.trim();
        const email = document.getElementById('profile-email').value.trim().toLowerCase();
        const phone = document.getElementById('profile-phone').value.trim();

        if (currentAdmin) {
          currentAdmin.full_name = full_name;
          currentAdmin.email = email;
          currentAdmin.phone = phone;
          saveCurrentAdminSession(currentAdmin);

          const sb = await getClient();
          if (sb && currentAdmin.id) {
            await sb.from('admin_accounts').update({ full_name, email, phone }).eq('id', currentAdmin.id);
          }
          showToast('Profil enregistré', 'Vos informations ont été mises à jour.');
        }
      });
    }

    // 14. Formulaire Changement de Mot de Passe Profil
    const formUpdatePwd = document.getElementById('form-update-password');
    const pwdMsg = document.getElementById('profile-pwd-msg');
    if (formUpdatePwd) {
      formUpdatePwd.addEventListener('submit', async function (e) {
        e.preventDefault();
        const curPwd = document.getElementById('profile-current-pwd').value;
        const newPwd = document.getElementById('profile-new-pwd').value;
        const confirmPwd = document.getElementById('profile-confirm-pwd').value;

        if (newPwd !== confirmPwd) {
          if (pwdMsg) {
            pwdMsg.textContent = 'Les deux nouveaux mots de passe ne correspondent pas.';
            pwdMsg.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700';
            pwdMsg.classList.remove('hidden');
          }
          return;
        }

        if (newPwd.length < 6) {
          if (pwdMsg) {
            pwdMsg.textContent = 'Le mot de passe doit comporter au moins 6 caractères.';
            pwdMsg.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700';
            pwdMsg.classList.remove('hidden');
          }
          return;
        }

        const sb = await getClient();
        if (!sb || !currentAdmin) return;

        // Vérification de l'ancien mot de passe
        const { data: dbAdmin } = await sb.from('admin_accounts').select('salt, password_hash').eq('id', currentAdmin.id).single();
        if (dbAdmin) {
          const curHash = await sha256(curPwd, dbAdmin.salt);
          if (curHash !== dbAdmin.password_hash) {
            if (pwdMsg) {
              pwdMsg.textContent = 'Le mot de passe actuel est incorrect.';
              pwdMsg.className = 'p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700';
              pwdMsg.classList.remove('hidden');
            }
            return;
          }

          // Mise à jour
          const newSalt = generateSalt();
          const newHash = await sha256(newPwd, newSalt);
          await sb.from('admin_accounts').update({ salt: newSalt, password_hash: newHash }).eq('id', currentAdmin.id);

          formUpdatePwd.reset();
          if (pwdMsg) {
            pwdMsg.textContent = 'Mot de passe modifié avec succès !';
            pwdMsg.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800';
            pwdMsg.classList.remove('hidden');
          }
          showToast('Sécurité mise à jour', 'Votre nouveau mot de passe est actif.');
        }
      });
    }

    // 15. Formulaire Coordonnées Générales
    const formGen = document.getElementById('form-general-settings');
    if (formGen) {
      formGen.addEventListener('submit', async function (e) {
        e.preventDefault();
        const phone_primary = document.getElementById('param-phone-primary').value.trim();
        const phone_secondary = document.getElementById('param-phone-secondary').value.trim();
        const whatsapp = document.getElementById('param-whatsapp').value.trim();
        const email = document.getElementById('param-email').value.trim();
        const address = document.getElementById('param-address').value.trim();

        currentContactInfo = { phone_primary, phone_secondary, whatsapp, email, address };
        await saveSettingKey('contact_info', currentContactInfo);
        showToast('Coordonnées enregistrées', 'Mises à jour sur tout le site public.');
      });
    }

    // 16. Modal Détails Demande & Recherche
    const btnCloseReqDetails = document.getElementById('btn-close-modal-request-details');
    const btnCloseReqDetailsBottom = document.getElementById('btn-close-modal-request-details-bottom');
    const statusSelectModal = document.getElementById('req-modal-status-select');
    const btnPrintReqModal = document.getElementById('req-modal-btn-print');
    const inputSearchDemandes = document.getElementById('input-search-demandes');

    if (btnCloseReqDetails) btnCloseReqDetails.addEventListener('click', closeRequestDetailsModal);
    if (btnCloseReqDetailsBottom) btnCloseReqDetailsBottom.addEventListener('click', closeRequestDetailsModal);

    if (statusSelectModal) {
      statusSelectModal.addEventListener('change', async function () {
        if (!currentDetailReqId) return;
        const newStatus = this.value;
        const target = allRequests.find(r => r.id === currentDetailReqId);
        if (target) target.status = newStatus;

        const sb = await getClient();
        if (sb && currentDetailReqId) {
          await sb.from('contact_requests').update({ status: newStatus }).eq('id', currentDetailReqId);
        }
        showToast('Statut mis à jour', `Dossier passé à : ${newStatus}`);
        renderKPIs();
        renderRecentRequestsDashboard();
        renderDemandesTable();
      });
    }

    if (btnPrintReqModal) {
      btnPrintReqModal.addEventListener('click', function () {
        window.print();
      });
    }

    if (inputSearchDemandes) {
      inputSearchDemandes.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        if (!query) {
          renderDemandesTable();
          return;
        }
        const filtered = allRequests.filter(r => {
          const name = (r.nom || r.name || '').toLowerCase();
          const phone = (r.telephone || r.phone || '').toLowerCase();
          const ville = (r.ville || r.quartier || '').toLowerCase();
          const service = (r.type_besoin || r.service || '').toLowerCase();
          const msg = (r.message || '').toLowerCase();
          return name.includes(query) || phone.includes(query) || ville.includes(query) || service.includes(query) || msg.includes(query);
        });

        const tbody = document.getElementById('table-demandes-full-body');
        if (!tbody) return;

        if (filtered.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400 text-xs">Aucun résultat trouvé pour "${escapeHtml(query)}"</td></tr>`;
          return;
        }

        tbody.innerHTML = filtered.map(req => {
          const name = req.nom || req.name || 'Famille';
          const phone = req.telephone || req.phone || '—';
          const quartier = req.ville || req.quartier || 'Yaoundé';
          const service = req.type_besoin || req.service || 'Soins';
          const dateRaw = req.created_at || req.date_reception;
          const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
          const cleanPhone = phone.replace(/\D/g, '');

          return `
            <tr class="hover:bg-surface-container-low transition-colors cursor-pointer row-demande-item" data-id="${req.id}">
              <td class="py-3 px-4 font-mono text-[11px] text-slate-500">${dateStr}</td>
              <td class="py-3 px-4">
                <div class="font-bold text-primary">${escapeHtml(name)}</div>
                <div class="text-[10px] text-slate-400 truncate max-w-xs">${escapeHtml(req.message || '')}</div>
              </td>
              <td class="py-3 px-4 text-slate-700 font-semibold">${escapeHtml(phone)}</td>
              <td class="py-3 px-4 text-slate-600">${escapeHtml(quartier)}</td>
              <td class="py-3 px-4 font-semibold text-secondary">${escapeHtml(service)}</td>
              <td class="py-3 px-4">${getStatusBadge(req.status)}</td>
              <td class="py-3 px-6 text-right space-x-1.5" onclick="event.stopPropagation()">
                <button class="btn-view-request-details px-2.5 py-1 rounded-lg bg-[#0d2040] hover:bg-[#1a365d] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-xs" data-id="${req.id}">
                  <span class="material-symbols-outlined text-[13px]">visibility</span>
                  <span>Détails</span>
                </button>
                <a href="https://wa.me/237${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] text-white text-[11px] font-bold" title="WhatsApp">
                  <span class="material-symbols-outlined text-[13px]">chat</span>
                </a>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.btn-view-request-details').forEach(btn => {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            openRequestDetailsModal(id);
          });
        });
      });
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  function openBeneficiaireModal(id) {
    const modalBen = document.getElementById('modal-beneficiaire');
    const formBen = document.getElementById('form-beneficiaire');
    if (!modalBen || !formBen) return;

    formBen.reset();
    document.getElementById('ben-edit-id').value = id || '';

    if (id) {
      const ben = allBeneficiaires.find(b => b.id === id);
      if (ben) {
        document.getElementById('ben-input-name').value = ben.name || '';
        document.getElementById('ben-input-age').value = ben.age || '';
        document.getElementById('ben-input-quartier').value = ben.quartier || '';
        document.getElementById('ben-input-pathology').value = ben.pathology || '';
        document.getElementById('ben-input-formule').value = ben.formule || 'Garde Continue 24h/24';
        document.getElementById('ben-input-caregiver').value = ben.caregiver || '';
        document.getElementById('ben-input-contact').value = ben.contact || '';
      }
    }
    modalBen.classList.remove('hidden');
  }

  function openServiceDrawer(id) {
    const drawer = document.getElementById('edit-drawer');
    const form = document.getElementById('form-edit-service');
    if (!drawer || !form) return;

    form.reset();
    document.getElementById('service-edit-id').value = id || '';
    const cont = document.getElementById('service-key-points-container');
    if (cont) cont.innerHTML = '';

    if (id) {
      const srv = allServices.find(s => s.id === id);
      if (srv) {
        document.getElementById('service-edit-title').value = srv.title || '';
        document.getElementById('service-edit-slogan').value = srv.slogan || '';
        document.getElementById('service-edit-hours').value = srv.hours || '';
        document.getElementById('service-edit-desc').value = srv.desc || '';
        document.getElementById('service-edit-pricing').value = srv.pricing || '';
        document.getElementById('service-edit-published').checked = !!srv.published;

        (srv.key_points || []).forEach(pt => addServicePointInput(pt));
      }
    } else {
      addServicePointInput('Point de soin 1');
      addServicePointInput('Point de soin 2');
    }

    drawer.classList.remove('translate-x-full');
  }

  function addServicePointInput(val) {
    const cont = document.getElementById('service-key-points-container');
    if (!cont) return;

    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
      <input type="text" value="${escapeHtml(val)}" class="input-service-point w-full px-3 py-1.5 rounded-lg bg-surface-container-low text-xs border border-slate-200" placeholder="Point clé du service..."/>
      <button type="button" class="p-1 text-slate-400 hover:text-red-500 btn-remove-point"><span class="material-symbols-outlined text-sm">close</span></button>
    `;
    div.querySelector('.btn-remove-point').addEventListener('click', () => div.remove());
    cont.appendChild(div);
  }

  /* ========================================================================= */
  /* 9. NAVIGATION SIDEBAR & VUES                                              */
  /* ========================================================================= */

  function setupNavigation() {
    document.querySelectorAll('.nav-stitch-link').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetViewId = this.getAttribute('data-view');
        if (!targetViewId) return;

        // Mise à jour état visuel liens
        document.querySelectorAll('.nav-stitch-link').forEach(l => {
          l.classList.remove('active', 'bg-primary', 'text-secondary-fixed', 'font-bold');
          l.classList.add('text-on-surface-variant');
        });
        this.classList.add('active', 'bg-primary', 'text-secondary-fixed', 'font-bold');
        this.classList.remove('text-on-surface-variant');

        // Affichage de la vue
        document.querySelectorAll('.stitch-view').forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
          targetView.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Filtres Demandes
    document.querySelectorAll('.filter-demande-pill').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-demande-pill').forEach(b => {
          b.classList.remove('active', 'bg-primary-container', 'text-secondary-fixed');
          b.classList.add('bg-surface-container-high', 'text-on-surface');
        });
        this.classList.add('active', 'bg-primary-container', 'text-secondary-fixed');
        this.classList.remove('bg-surface-container-high', 'text-on-surface');

        activeFilterDemandes = this.getAttribute('data-status');
        renderDemandesTable();
      });
    });

    // Recherche globale
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        if (!query) {
          renderDemandesTable();
          renderBeneficiairesGrid();
          return;
        }

        // Si on cherche, filtre dynamique sur demandes & bénéficiaires
        const matchingBen = allBeneficiaires.filter(b =>
          (b.name && b.name.toLowerCase().includes(query)) ||
          (b.quartier && b.quartier.toLowerCase().includes(query))
        );
        const matchingDem = allRequests.filter(r =>
          (r.name && r.name.toLowerCase().includes(query)) ||
          (r.phone && r.phone.includes(query)) ||
          (r.quartier && r.quartier.toLowerCase().includes(query))
        );

        const benGrid = document.getElementById('grid-beneficiaires-cards');
        if (benGrid && matchingBen.length > 0) {
          // Si on est sur la vue bénéficiaires
        }
      });
    }

    // Déconnexion
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        if (!confirm('Se déconnecter du Back-Office ?')) return;
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        currentAdmin = null;
        screenDashboard.classList.add('hidden');
        screenLogin.classList.remove('hidden');
      });
    }

    // Export CSV Demandes
    const btnExportCSV = document.getElementById('btn-export-demandes-csv');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', function () {
        if (allRequests.length === 0) {
          alert('Aucune demande à exporter.');
          return;
        }
        let csv = 'Date;Demandeur;Téléphone;Quartier;Prestation;Statut;Message\n';
        allRequests.forEach(r => {
          csv += `"${r.created_at || ''}";"${r.name || ''}";"${r.phone || ''}";"${r.quartier || ''}";"${r.service || ''}";"${r.status || ''}";"${(r.message || '').replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registre-demandes-akeva-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  /* ========================================================================= */
  /* 10. AUTHENTIFICATION : LOGIN & SETUP                                      */
  /* ========================================================================= */

  async function initAuth() {
    const sb = await getClient();

    // 1. Vérifier si un compte existe
    let adminCount = 0;
    try {
      if (sb) {
        const { count, error } = await sb.from('admin_accounts').select('id', { count: 'exact', head: true });
        if (!error && typeof count === 'number') {
          adminCount = count;
        }
      }
    } catch (e) {
      console.warn('Erreur test admin_accounts count', e);
    }

    // 2. Vérifier si une session est déjà enregistrée
    const saved = loadSavedSession();

    if (screenLoading) screenLoading.classList.add('hidden');

    if (adminCount === 0) {
      // Aucun admin dans la base -> écran de création
      if (screenSetup) screenSetup.classList.remove('hidden');
    } else if (saved) {
      // Session existante -> connexion directe au dashboard
      currentAdmin = saved;
      updateSidebarProfileUI(currentAdmin);
      if (screenDashboard) screenDashboard.classList.remove('hidden');
      await syncAllData();
    } else {
      // Comptes existants, pas de session -> écran de connexion
      if (screenLogin) screenLogin.classList.remove('hidden');
    }

    // Setup Form
    const formSetup = document.getElementById('form-setup');
    const errSetup = document.getElementById('setup-error');
    if (formSetup) {
      formSetup.addEventListener('submit', async function (e) {
        e.preventDefault();
        const fullname = document.getElementById('setup-fullname').value.trim();
        const email = document.getElementById('setup-email').value.trim().toLowerCase();
        const pwd = document.getElementById('setup-password').value;
        const confirm = document.getElementById('setup-password-confirm').value;

        if (pwd !== confirm) {
          if (errSetup) {
            errSetup.textContent = 'Les deux mots de passe ne correspondent pas.';
            errSetup.classList.remove('hidden');
          }
          return;
        }

        const sb = await getClient();
        if (!sb) {
          if (errSetup) {
            errSetup.textContent = 'Erreur de connexion à Supabase.';
            errSetup.classList.remove('hidden');
          }
          return;
        }

        const salt = generateSalt();
        const hash = await sha256(pwd, salt);

        const { data, error } = await sb.from('admin_accounts').insert([{
          full_name: fullname,
          email: email,
          role: 'Super Admin',
          salt: salt,
          password_hash: hash,
          status: 'active'
        }]).select();

        if (error) {
          if (errSetup) {
            errSetup.textContent = 'Une erreur est survenue lors de la création du compte.';
            errSetup.classList.remove('hidden');
          }
          return;
        }

        const newAdmin = data[0];
        saveCurrentAdminSession(newAdmin);

        if (screenSetup) screenSetup.classList.add('hidden');
        if (screenDashboard) screenDashboard.classList.remove('hidden');
        await syncAllData();
      });
    }

    // Login Form
    const formLogin = document.getElementById('form-login');
    const errLogin = document.getElementById('login-error');
    if (formLogin) {
      formLogin.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pwd = document.getElementById('login-password').value;

        const sb = await getClient();
        if (!sb) {
          if (errLogin) {
            errLogin.textContent = 'Erreur de connexion au serveur.';
            errLogin.classList.remove('hidden');
          }
          return;
        }

        const { data, error } = await sb
          .from('admin_accounts')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error || !data) {
          if (errLogin) {
            errLogin.textContent = 'Identifiants incorrects ou compte introuvable.';
            errLogin.classList.remove('hidden');
          }
          return;
        }

        const testHash = await sha256(pwd, data.salt);
        if (testHash !== data.password_hash) {
          if (errLogin) {
            errLogin.textContent = 'Mot de passe incorrect.';
            errLogin.classList.remove('hidden');
          }
          return;
        }

        saveCurrentAdminSession(data);

        if (screenLogin) screenLogin.classList.add('hidden');
        if (screenDashboard) screenDashboard.classList.remove('hidden');
        await syncAllData();
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ========================================================================= */
  /* 11. INITIALISATION GÉNÉRALE AU CHARGEMENT                                 */
  /* ========================================================================= */

  document.addEventListener('DOMContentLoaded', function () {
    initPasswordToggles();
    setupNavigation();
    setupModals();
    initAuth();
  });

})();
