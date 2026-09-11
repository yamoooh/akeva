# Akeva Sérénité — Site Web Vitrine & Système de Coordination

> **« Le soin qui apaise, la présence qui rassure. »**  
> *Votre proche entre de bonnes mains.*

Akeva Sérénité est le partenaire de confiance pour l'accompagnement à domicile et la garde de personnes âgées, malades ou en perte d'autonomie à Yaoundé (Ngousso), Cameroun.

---

## 🌟 Fonctionnalités

- **12 Pages Web Modernes & Responsives** :
  - **Accueil** (`index.html`) : Présentation claire des prestations concrètes (toilette/hygiène, nutrition, médicaments, présence 24h/24).
  - **Nos Services** (`services.html`) et 5 sous-pages dédiées :
    - `services/personnes-agees.html` : Maintien à domicile et présence affective.
    - `services/a-domicile.html` : Intervention au domicile familial à Yaoundé.
    - `services/hospitalier.html` : Garde et accompagnement à l'hôpital (Hôpital Général de Yaoundé...).
    - `services/specialise.html` : Pathologies chroniques, post-AVC et convalescence.
    - `services/diaspora.html` : Solution pour les familles de la diaspora (Europe, Amérique du Nord).
  - **Tarifs & Devis** (`tarifs.html`) : Grilles tarifaires transparentes et simulation.
  - **À Propos** (`a-propos.html`) : Histoire, valeurs, charte éthique et fondation.
  - **Témoignages** (`temoignages.html`) : Retours certifiés des familles.
  - **Foire Aux Questions** (`faq.html`) : Réponses complètes aux interrogations courantes.
  - **Contact & Demande** (`contact.html`) : Formulaire relié en direct à la base Supabase et à WhatsApp.
- **Portail Interne de Supervision** (`backoffice/index.html`) :
  - Gestion des demandes d'accompagnement.
  - Filtres par statut (Toutes, Non traitées, Traitées).
  - Recherche en direct par nom, téléphone, quartier.
  - Connexion sécurisée.
- **Intégration Supabase Backend** :
  - Table PostgreSQL `contact_requests` avec Row Level Security (RLS).
  - Synchronisation temps réel ou fallback localStorage.
- **Boutons & Widget WhatsApp Officiels** :
  - Logo vectoriel officiel (`assets/whatsapp.svg`).
  - Boutons de redirection pré-remplis vers `+237 697 572 685`.
- **Référencement SEO Exhaustif** :
  - `robots.txt` et `sitemap.xml` conformes.
  - Balises Open Graph et Twitter Card.
  - Données structurées Schema.org JSON-LD (`HomeHealthService`, `LocalBusiness`, `FAQPage`, etc.).

---

## 🚀 Déploiement

### 1. Hébergement Frontend (GitHub Pages / Vercel / Netlify)
- **GitHub Pages** :
  1. Allez dans **Settings** > **Pages** de votre dépôt GitHub.
  2. Choisissez la branche `main` (dossier `/root`).
  3. Cliquez sur **Save**. Votre site est en ligne en quelques secondes !
- **Vercel / Netlify** :
  1. Importez ce dépôt GitHub.
  2. Aucun build nécessaire (site statique HTML/JS pur).
  3. Déploiement instantané.

### 2. Base de Données Supabase
- Le backend est hébergé sur le projet Supabase **akeva** (`ztbgcgntluttgzjunwvu`).
- URL de l'API : `https://ztbgcgntluttgzjunwvu.supabase.co`.
- Table : `public.contact_requests`.

---

## 📞 Contact Entreprise

- **Localisation** : Ngousso, Yaoundé, Cameroun
- **Téléphones** : +237 697 572 685 / +237 653 151 427
- **Disponibilité** : 24h/24, 7j/7