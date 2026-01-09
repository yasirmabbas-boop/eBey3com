type Language = "ar" | "ku";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface ValidationMessages {
  ar: string;
  ku: string;
}

const messages = {
  required: {
    ar: "هذا الحقل مطلوب",
    ku: "ئەم خانەیە پێویستە"
  },
  phoneInvalid: {
    ar: "رقم الهاتف غير صالح",
    ku: "ژمارەی مۆبایل دروست نییە"
  },
  phoneFormat: {
    ar: "أدخل رقم هاتف عراقي صالح (07xxxxxxxxx)",
    ku: "ژمارەی مۆبایلی عێراقی دروست بنووسە (07xxxxxxxxx)"
  },
  passwordMin: {
    ar: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    ku: "وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت"
  },
  passwordsMatch: {
    ar: "كلمات المرور غير متطابقة",
    ku: "وشەی نهێنییەکان یەک ناگرنەوە"
  },
  emailInvalid: {
    ar: "البريد الإلكتروني غير صالح",
    ku: "ئیمەیڵ دروست نییە"
  },
  usernameMin: {
    ar: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    ku: "ناوی بەکارهێنەر دەبێت لانیکەم ٣ پیت بێت"
  },
  usernameFormat: {
    ar: "اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط",
    ku: "ناوی بەکارهێنەر تەنها پیت و ژمارە دەگرێتەوە"
  },
  priceMin: {
    ar: "السعر يجب أن يكون أكبر من صفر",
    ku: "نرخ دەبێت لە سفر زیاتر بێت"
  },
  titleMin: {
    ar: "العنوان يجب أن يكون 5 أحرف على الأقل",
    ku: "ناونیشان دەبێت لانیکەم ٥ پیت بێت"
  },
  descriptionMin: {
    ar: "الوصف يجب أن يكون 10 أحرف على الأقل",
    ku: "وەسف دەبێت لانیکەم ١٠ پیت بێت"
  },
  selectRequired: {
    ar: "يرجى اختيار خيار",
    ku: "تکایە هەڵبژاردەیەک دیاری بکە"
  },
  imageRequired: {
    ar: "يرجى إضافة صورة واحدة على الأقل",
    ku: "تکایە لانیکەم یەک وێنە زیاد بکە"
  },
  termsRequired: {
    ar: "يجب الموافقة على الشروط والأحكام",
    ku: "دەبێت لەگەڵ مەرج و ڕێساکان ڕازی بیت"
  },
  bidTooLow: {
    ar: "المزايدة يجب أن تكون أعلى من السعر الحالي",
    ku: "مزایدە دەبێت لە نرخی ئێستا زیاتر بێت"
  },
  quantityMin: {
    ar: "الكمية يجب أن تكون 1 على الأقل",
    ku: "بڕ دەبێت لانیکەم ١ بێت"
  },
  dateInPast: {
    ar: "التاريخ يجب أن يكون في المستقبل",
    ku: "بەروار دەبێت لە داهاتوودا بێت"
  },
};

export function getValidationMessage(key: keyof typeof messages, language: Language): string {
  return messages[key][language];
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
