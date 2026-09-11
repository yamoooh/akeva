/**
 * Gestion du Formulaire de Contact Akeva Sérénité
 */

document.addEventListener('DOMContentLoaded', function () {
  var contactForm = document.getElementById('akeva-contact-form');
  var formFeedback = document.getElementById('form-feedback');

  if (!contactForm) return;

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

  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Envoi en cours...';
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

    try {
      if (window.AkevaDB) {
        await AkevaDB.addRequest({
          nom: nom,
          telephone: telephone,
          ville: ville,
          type_besoin: type_besoin,
          date_souhaitee: date_souhaitee,
          message: message
        });
      }

      if (formFeedback) {
        formFeedback.classList.remove('hidden');
        formFeedback.innerHTML = `
          <div class="p-6 rounded-2xl bg-[#002718] text-white border border-[#4edea3]/40 shadow-xl animate-fade-in">
            <div class="flex items-center gap-3 mb-2 text-[#4edea3]">
              <span class="material-symbols-outlined text-[28px]">verified</span>
              <h4 class="font-bold text-[18px]">Demande transmise avec succès !</h4>
            </div>
            <p class="text-[14px] text-white/90 mb-4 leading-relaxed">
              Merci <strong>${nom}</strong>. Notre équipe de coordination de Yaoundé a bien reçu votre demande pour <strong>${type_besoin || 'votre proche'}</strong> et vous contactera dans les plus brefs délais au <strong>${telephone}</strong>.
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
        alert("Votre demande a bien été enregistrée. L'équipe Akeva Sérénité vous contactera sous peu.");
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
});