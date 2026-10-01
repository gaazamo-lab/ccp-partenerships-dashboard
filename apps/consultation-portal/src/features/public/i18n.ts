/**
 * Form chrome (buttons, errors) for the public form. Question text comes from
 * each consultation's own translations; these are only the fixed labels.
 * Languages without an entry fall back to English — Twi, Ewe, Ga, Hausa and
 * Dagbani chrome strings still need a professional translator.
 */
const STRINGS = {
  en: {
    language: 'Language',
    next: 'Next',
    back: 'Back',
    submit: 'Submit response',
    submitting: 'Submitting',
    step: (current: number, total: number) => `Page ${current} of ${total}`,
    required: 'This question is required.',
    chooseOne: 'Choose an answer.',
    choose: 'Choose…',
    numberRange: (min?: number, max?: number) =>
      min !== undefined && max !== undefined ? `Enter a number from ${min} to ${max}.` : 'Enter a valid number.',
    fixErrors: 'Review the highlighted questions before continuing.',
  },
  fr: {
    language: 'Langue',
    next: 'Suivant',
    back: 'Précédent',
    submit: 'Envoyer ma réponse',
    submitting: 'Envoi en cours',
    step: (current: number, total: number) => `Page ${current} sur ${total}`,
    required: 'Cette question est obligatoire.',
    chooseOne: 'Choisissez une réponse.',
    choose: 'Choisir…',
    numberRange: (min?: number, max?: number) =>
      min !== undefined && max !== undefined ? `Saisissez un nombre entre ${min} et ${max}.` : 'Saisissez un nombre valide.',
    fixErrors: 'Vérifiez les questions signalées avant de continuer.',
  },
  ar: {
    language: 'اللغة',
    next: 'التالي',
    back: 'السابق',
    submit: 'إرسال الإجابة',
    submitting: 'جارٍ الإرسال',
    step: (current: number, total: number) => `الصفحة ${current} من ${total}`,
    required: 'هذا السؤال إلزامي.',
    chooseOne: 'اختر إجابة.',
    choose: 'اختر…',
    numberRange: (min?: number, max?: number) =>
      min !== undefined && max !== undefined ? `أدخل رقمًا من ${min} إلى ${max}.` : 'أدخل رقمًا صحيحًا.',
    fixErrors: 'راجع الأسئلة المميزة قبل المتابعة.',
  },
};

export type FormStrings = (typeof STRINGS)['en'];

export function formStrings(language: string): FormStrings {
  return (STRINGS as Record<string, FormStrings>)[language] ?? STRINGS.en;
}
