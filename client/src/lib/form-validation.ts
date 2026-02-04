type Language = "ar" | "ku" | "en";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface ValidationMessages {
  ar: string;
  ku: string;
  en: string;
}

const messages = {
  required: {
    ar: "هذا الحقل مطلوب",
    ku: "ئەم خانەیە پێویستە",
    en: "This field is required"
  },
  phoneInvalid: {
    ar: "رقم الهاتف غير صالح",
    ku: "ژمارەی مۆبایل دروست نییە",
    en: "Phone number is invalid"
  },
  phoneFormat: {
    ar: "أدخل رقم هاتف عراقي صالح (07xxxxxxxxx)",
    ku: "ژمارەی مۆبایلی عێراقی دروست بنووسە (07xxxxxxxxx)",
    en: "Enter a valid Iraqi phone number (07xxxxxxxxx)"
  },
  passwordMin: {
    ar: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    ku: "وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت",
    en: "Password must be at least 6 characters"
  },
  passwordsMatch: {
    ar: "كلمات المرور غير متطابقة",
    ku: "وشەی نهێنییەکان یەک ناگرنەوە",
    en: "Passwords do not match"
  },
  emailInvalid: {
    ar: "البريد الإلكتروني غير صالح",
    ku: "ئیمەیڵ دروست نییە",
    en: "Email is invalid"
  },
  usernameMin: {
    ar: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    ku: "ناوی بەکارهێنەر دەبێت لانیکەم ٣ پیت بێت",
    en: "Username must be at least 3 characters"
  },
  usernameFormat: {
    ar: "اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط",
    ku: "ناوی بەکارهێنەر تەنها پیت و ژمارە دەگرێتەوە",
    en: "Username can only contain letters and numbers"
  },
  priceMin: {
    ar: "السعر يجب أن يكون أكبر من صفر",
    ku: "نرخ دەبێت لە سفر زیاتر بێت",
    en: "Price must be greater than zero"
  },
  titleMin: {
    ar: "العنوان يجب أن يكون 5 أحرف على الأقل",
    ku: "ناونیشان دەبێت لانیکەم ٥ پیت بێت",
    en: "Title must be at least 5 characters"
  },
  descriptionMin: {
    ar: "الوصف يجب أن يكون 10 أحرف على الأقل",
    ku: "وەسف دەبێت لانیکەم ١٠ پیت بێت",
    en: "Description must be at least 10 characters"
  },
  selectRequired: {
    ar: "يرجى اختيار خيار",
    ku: "تکایە هەڵبژاردەیەک دیاری بکە",
    en: "Please select an option"
  },
  imageRequired: {
    ar: "يرجى إضافة صورتين على الأقل",
    ku: "تکایە لانیکەم دوو وێنە زیاد بکە",
    en: "Please add at least two images"
  },
  termsRequired: {
    ar: "يجب الموافقة على الشروط والأحكام",
    ku: "دەبێت لەگەڵ مەرج و ڕێساکان ڕازی بیت",
    en: "You must accept the terms and conditions"
  },
  bidTooLow: {
    ar: "المزايدة يجب أن تكون أعلى من السعر الحالي",
    ku: "مزایدە دەبێت لە نرخی ئێستا زیاتر بێت",
    en: "Bid must be higher than the current price"
  },
  quantityMin: {
    ar: "الكمية يجب أن تكون 1 على الأقل",
    ku: "بڕ دەبێت لانیکەم ١ بێت",
    en: "Quantity must be at least 1"
  },
  dateInPast: {
    ar: "التاريخ يجب أن يكون في المستقبل",
    ku: "بەروار دەبێت لە داهاتوودا بێت",
    en: "Date must be in the future"
  },
};

export function getValidationMessage(key: keyof typeof messages, language: Language): string {
  return messages[key][language] || messages[key].ar;
}

export function validateRequired(value: string | null | undefined, language: Language): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: false, message: messages.required[language] };
  }
  return { valid: true };
}

export function validatePhone(phone: string, language: Language): ValidationResult {
  if (!phone || phone.trim() === "") {
    return { valid: false, message: messages.required[language] };
  }
  const phoneRegex = /^07[0-9]{9}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
    return { valid: false, message: messages.phoneFormat[language] };
  }
  return { valid: true };
}

export function validatePassword(password: string, language: Language): ValidationResult {
  if (!password) {
    return { valid: false, message: messages.required[language] };
  }
  if (password.length < 6) {
    return { valid: false, message: messages.passwordMin[language] };
  }
  return { valid: true };
}

export function validatePasswordsMatch(password: string, confirmPassword: string, language: Language): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, message: messages.passwordsMatch[language] };
  }
  return { valid: true };
}

export function validateEmail(email: string, language: Language): ValidationResult {
  if (!email || email.trim() === "") {
    return { valid: true }; // Email is optional
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: messages.emailInvalid[language] };
  }
  return { valid: true };
}

export function validateUsername(username: string, language: Language): ValidationResult {
  if (!username || username.trim() === "") {
    return { valid: false, message: messages.required[language] };
  }
  if (username.length < 3) {
    return { valid: false, message: messages.usernameMin[language] };
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: messages.usernameFormat[language] };
  }
  return { valid: true };
}

export function validatePrice(price: number | string, language: Language): ValidationResult {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice) || numPrice <= 0) {
    return { valid: false, message: messages.priceMin[language] };
  }
  return { valid: true };
}

export function validateTitle(title: string, language: Language): ValidationResult {
  if (!title || title.trim() === "") {
    return { valid: false, message: messages.required[language] };
  }
  if (title.trim().length < 5) {
    return { valid: false, message: messages.titleMin[language] };
  }
  return { valid: true };
}

export function validateDescription(description: string, language: Language): ValidationResult {
  if (!description || description.trim() === "") {
    return { valid: false, message: messages.required[language] };
  }
  if (description.trim().length < 10) {
    return { valid: false, message: messages.descriptionMin[language] };
  }
  return { valid: true };
}

export function validateBid(bidAmount: number, currentBid: number, language: Language): ValidationResult {
  if (bidAmount <= currentBid) {
    return { valid: false, message: messages.bidTooLow[language] };
  }
  return { valid: true };
}

export function validateFutureDate(date: Date | string, language: Language): ValidationResult {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (dateObj <= new Date()) {
    return { valid: false, message: messages.dateInPast[language] };
  }
  return { valid: true };
}
