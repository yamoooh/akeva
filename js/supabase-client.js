/**
 * Client Supabase & Gestionnaire de Données Hybride (Supabase + LocalStorage)
 * Akeva Sérénité
 */

var AkevaDB = (function () {
  // Clés Supabase officielles projet 'akeva' (ztbgcgntluttgzjunwvu)
  var SUPABASE_URL = window.AKEVA_SUPABASE_URL || "https://ztbgcgntluttgzjunwvu.supabase.co";
  var SUPABASE_ANON_KEY = window.AKEVA_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmdjZ250bHV0dGd6anVud3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDYxNTYsImV4cCI6MjEwNDcyMjE1Nn0.zbUeyWvnBF7V5DBhbAqJBu1gYaGDt_G7wA5SBtiotmA";

  var LOCAL_STORAGE_KEY = 'akeva_demandes_v1';

  // Initialisation du client Supabase si disponible
  var supabaseClient = null;
  if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn("Supabase non initialisé, bascule sur le stockage local :", e);
    }
  }

  // Obtenir toutes les demandes locales
  function getLocalRequests() {
    try {
      var data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) {
        // Exemples initiaux pour prévisualiser le back-office
        var initialData = [
          {
            id: 'req-' + Date.now() + '-1',
            nom: 'Famille Ngo Nlend',
            telephone: '699 12 34 56',
            ville: 'Yaoundé (Bastos)',
            type_besoin: "Accompagnement d'un parent âgé",
            date_souhaitee: '2026-09-15',
            message: 'Recherche auxiliaire de vie bienveillante pour garde de jour.',
            date_reception: new Date(Date.now() - 3600000 * 2).toISOString(),
            traite: false
          },
          {
            id: 'req-' + Date.now() + '-2',
            nom: 'M. Jean-Paul Mbarga',
            telephone: '677 88 99 00',
            ville: 'Yaoundé (Ngousso)',
            type_besoin: 'Garde 24h/24 continue',
            date_souhaitee: '2026-09-20',
            message: 'Sortie d’hospitalisation pour maman, besoin de présence continue.',
            date_reception: new Date(Date.now() - 3600000 * 8).toISOString(),
            traite: true
          }
        ];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error("Erreur lecture localStorage:", e);
      return [];
    }
  }

  // Sauvegarder les demandes locales
  function saveLocalRequests(requests) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
    } catch (e) {
      console.error("Erreur écriture localStorage:", e);
    }
  }

  return {
    // 1. Ajouter une demande
    addRequest: async function (requestData) {
      var newReq = {
        id: 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        nom: requestData.nom || '',
        telephone: requestData.telephone || '',
        ville: requestData.ville || '',
        type_besoin: requestData.type_besoin || '',
        date_souhaitee: requestData.date_souhaitee || '',
        message: requestData.message || '',
        date_reception: new Date().toISOString(),
        traite: false
      };

      // Sauvegarde locale immédiate
      var current = getLocalRequests();
      current.unshift(newReq);
      saveLocalRequests(current);

      // Envoi à Supabase si configuré
      if (supabaseClient) {
        try {
          await supabaseClient.from('contact_requests').insert([
            {
              nom: newReq.nom,
              telephone: newReq.telephone,
              ville: newReq.ville,
              type_besoin: newReq.type_besoin,
              date_souhaitee: newReq.date_souhaitee,
              message: newReq.message,
              traite: false
            }
          ]);
        } catch (err) {
          console.warn("Échec d'insertion distante Supabase (enregistré localement) :", err);
        }
      }

      return newReq;
    },

    // 2. Récupérer toutes les demandes (triées de la plus récente à la plus ancienne)
    getRequests: async function () {
      if (supabaseClient) {
        try {
          var res = await supabaseClient
            .from('contact_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (res.data && res.data.length > 0) {
            return res.data.map(function (item) {
              return {
                id: item.id,
                nom: item.nom,
                telephone: item.telephone,
                ville: item.ville,
                type_besoin: item.type_besoin,
                date_souhaitee: item.date_souhaitee,
                message: item.message,
                date_reception: item.created_at || item.date_reception,
                traite: !!item.traite
              };
            });
          }
        } catch (e) {
          console.warn("Supabase indisponible, bascule sur les données locales.");
        }
      }

      var local = getLocalRequests();
      // Tri par date de réception décroissante
      return local.sort(function (a, b) {
        return new Date(b.date_reception) - new Date(a.date_reception);
      });
    },

    // 3. Basculer l'état "Traité / Non traité"
    toggleStatus: async function (id, newState) {
      // Mise à jour locale
      var local = getLocalRequests();
      var found = local.find(function (r) { return r.id === id; });
      if (found) {
        found.traite = newState;
        saveLocalRequests(local);
      }

      // Mise à jour distante si Supabase est actif
      if (supabaseClient) {
        try {
          await supabaseClient
            .from('contact_requests')
            .update({ traite: newState })
            .eq('id', id);
        } catch (e) {
          console.warn("Erreur mise à jour Supabase :", e);
        }
      }

      return true;
    },

    // 4. Authentification Supabase Auth
    signIn: async function (email, password) {
      if (supabaseClient) {
        try {
          var res = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });
          if (res.error) throw res.error;
          return { success: true, user: res.data.user };
        } catch (err) {
          return { success: false, error: err.message };
        }
      }

      // Fallback sécurisé compte unique Super Admin pour Akeva
      if (email === 'admin@akeva.cm' && password === 'akeva2026') {
        var mockUser = { email: email, role: 'superadmin' };
        localStorage.setItem('akeva_admin_session', JSON.stringify(mockUser));
        return { success: true, user: mockUser };
      } else {
        return { success: false, error: 'Identifiants invalides.' };
      }
    },

    // Déconnexion
    signOut: async function () {
      if (supabaseClient) {
        try {
          await supabaseClient.auth.signOut();
        } catch (e) {}
      }
      localStorage.removeItem('akeva_admin_session');
    },

    // Vérifier la session active
    getSession: function () {
      try {
        var s = localStorage.getItem('akeva_admin_session');
        return s ? JSON.parse(s) : null;
      } catch (e) {
        return null;
      }
    }
  };
})();

// Exposer window.AkevaSupabase pour admin.js et site-sync.js
(function() {
  var url = window.AKEVA_SUPABASE_URL || "https://ztbgcgntluttgzjunwvu.supabase.co";
  var key = window.AKEVA_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmdjZ250bHV0dGd6anVud3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDYxNTYsImV4cCI6MjEwNDcyMjE1Nn0.zbUeyWvnBF7V5DBhbAqJBu1gYaGDt_G7wA5SBtiotmA";
  var client = null;
  if (window.supabase && url && key) {
    try {
      client = window.supabase.createClient(url, key);
    } catch (e) {
      console.warn("AkevaSupabase init warning:", e);
    }
  }
  window.AkevaSupabase = {
    client: client,
    url: url,
    anonKey: key
  };
})();
