/**
 * AKEVA SÉRÉNITÉ — Gestionnaire du Formulaire d'Évaluation & Demande d'Accompagnement
 * Double transmission :
 * 1. Enregistrement direct dans le Back-Office (Supabase DB + LocalStorage)
 * 2. Envoi automatique et instantané par Email à contact@akevaserenite.online
 */

document.addEventListener('DOMContentLoaded', function () {
  var contactForm = document.getElementById('akeva-contact-form');
  var formFeedback = document.getElementById('form-feedback');
  var OFFICIAL_EMAIL = "contact@akevaserenite.online";

  if (!contactForm) return;

  // Pré-sélection éventuelle du type de besoin depuis l'URL (?service=...)
  var urlParams = new URLSearchParams(window.location.search);
  var serviceParam = urlParams.get('service');
  if (serviceParam) {
    var selectField = document.getElementById('type_besoin');
    if (selectField) {
      for (var i = 0; i < selectField.options.length; i++) {
        if (selectField.options[i].value.toLowerCase().indexOf(serviceParam.toLowerCase()) !== -1 ||
            selectField.options[i].text.toLowerCase().indexOf(serviceParam.toLowerCase()) !== -1) {
          selectField.selectedIndex = i;
          break;
        }
      }
    }
  }

  /**
   * Fonction d'envoi automatique de l'email à la coordination
   */
  async function sendAutomaticEmail(data) {
    try {
      var dateFormatted = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      var payload = {
        _subject: "🚨 [Demande d'Accompagnement Akeva] " + (data.nom || 'Famille') + " — " + (data.type_besoin || 'Général'),
        _template: "table",
        _captcha: "false",
        "Nom et Prénom du demandeur": data.nom || 'Non spécifié',
        "Numéro de Téléphone": data.telephone || 'Non spécifié',
        "Ville / Quartier": data.ville || 'Non spécifié',
        "Formule d'accompagnement souhaitée": data.type_besoin || 'Non spécifié',
        "Date souhaitée de démarrage": data.date_souhaitee || 'Dès que possible',
        "Précisions sur la situation du proche": data.message || 'Aucune précision complémentaire',
        "Date et heure de transmission": dateFormatted,
        "Statut Back-Office": "Dossier enregistré dans la base de données Supabase / Espace Admin"
      };

      var res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(OFFICIAL_EMAIL), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      return res.ok;
    } catch (err) {
      console.warn("Notification email warning:", err);
      return false;
    }
  }

  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Transmission en cours...';
    }

    var nom = (document.getElementById('nom') || {}).value || '';
    var telephone = (document.getElementById('telephone') || {}).value || '';
    var ville = (document.getElementById('ville') || {}).value || '';
    var type_besoin = (document.getElementById('type_besoin') || {}).value || '';
    var date_souhaitee = (document.getElementById('date_souhaitee') || {}).value || '';
    var message = (document.getElementById('message') || {}).value || '';

    if (!nom || !telephone) {
      alert("Veuillez renseigner au moins votre nom et votre numéro de téléphone.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
      return;
    }

    var requestPayload = {
      nom: nom.trim(),
      telephone: telephone.trim(),
      ville: ville.trim(),
      type_besoin: type_besoin.trim(),
      date_souhaitee: date_souhaitee.trim(),
      message: message.trim()
    };

    try {
      // 1. Enregistrement direct dans le Back-Office (Supabase + LocalStorage)
      if (window.AkevaDB) {
        await AkevaDB.addRequest(requestPayload);
      }

      // 2. Envoi automatique et instantané par Email à contact@akevaserenite.online
      await sendAutomaticEmail(requestPayload);

      // 3. Affichage du feedback de succès
      if (formFeedback) {
        formFeedback.classList.remove('hidden');
        formFeedback.innerHTML = `
          <div class="p-6 rounded-2xl bg-[#002718] text-white border border-[#4edea3]/40 shadow-xl animate-fade-in">
            <div class="flex items-center gap-3 mb-2 text-[#4edea3]">
              <span class="material-symbols-outlined text-[28px]">verified</span>
              <h4 class="font-bold text-[18px]">Demande transmise avec succès !</h4>
            </div>
            <p class="text-[14px] text-white/90 mb-3 leading-relaxed">
              Merci <strong>${escapeHtml(nom)}</strong>. Votre dossier pour <strong>${escapeHtml(type_besoin || 'votre proche')}</strong> a bien été enregistré dans notre <strong>Back-Office</strong> et transmis par email à <strong>${OFFICIAL_EMAIL}</strong>.
            </p>
            <p class="text-[12.5px] text-emerald-200 mb-5">
              Notre équipe de coordination de Yaoundé vous contactera dans les plus brefs délais au <strong>${escapeHtml(telephone)}</strong>.
            </p>
            <div class="flex flex-wrap gap-3">
              <a href="https://wa.me/237697572685?text=${encodeURIComponent("Bonjour Akeva Sérénité, je viens de vous soumettre une demande sur le site pour : " + nom + " (" + telephone + ") - " + type_besoin)}"
                 target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-[13px] shadow transition-transform hover:scale-105">
                <img src="assets/whatsapp.svg" alt="WhatsApp" class="w-4 h-4 object-contain" />
                Notifier directement la coordination sur WhatsApp
              </a>
              <button type="button" onclick="window.location.reload()" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[13px]">
                Nouvelle demande
              </button>
            </div>
          </div>
        `;
        contactForm.style.display = 'none';
      } else {
        alert("Votre demande a bien été enregistrée et transmise par email à la coordination Akeva Sérénité.");
        contactForm.reset();
      }

    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'envoi. Veuillez nous contacter directement au 697 572 685.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
