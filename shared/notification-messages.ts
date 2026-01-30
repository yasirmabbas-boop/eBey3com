/**
 * Notification Message Templates
 * Supports Arabic and Kurdish languages with dynamic content
 */

export const NOTIFICATION_MESSAGES = {
  // 1. Auction Won
  auction_won: {
    ar: {
      title: "مبروك! فزت بالمزاد 🎉",
      body: (data: { title: string; amount: number }) => 
        `فزت بالمزاد على "${data.title}" بمبلغ ${data.amount.toLocaleString()} د.ع`
    },
    ku: {
      title: "پیرۆزە! تۆ بردتەوە 🎉",
      body: (data: { title: string; amount: number }) => 
        `تۆ مزایدەکەت بردەوە لەسەر "${data.title}" بە ${data.amount.toLocaleString()} د.ع`
    }
  },

  // 2. Auction Lost
  auction_lost: {
    ar: {
      title: "انتهى المزاد",
      body: (data: { title: string; amount: number }) => 
        `انتهى المزاد على "${data.title}" ولم تفز. المزايدة الفائزة كانت ${data.amount.toLocaleString()} د.ع`
    },
    ku: {
      title: "مزایدە تەواو بوو",
      body: (data: { title: string; amount: number }) => 
        `مزایدەکە لەسەر "${data.title}" تەواو بوو و تۆ نەتبردەوە. مزایدەی بردۆڤە ${data.amount.toLocaleString()} د.ع بوو`
    }
  },

  // 3. Auction Ended - No Bids
  auction_ended_no_bids: {
    ar: {
      title: "انتهى المزاد بدون مزايدات",
      body: (data: { title: string }) => 
        `انتهى المزاد على "${data.title}" بدون أي مزايدات. يمكنك إعادة عرض المنتج.`
    },
    ku: {
      title: "مزایدە تەواو بوو بەبێ مزایدە",
      body: (data: { title: string }) => 
        `مزایدەکە لەسەر "${data.title}" تەواو بوو بەبێ هیچ مزایدەیەک. دەتوانیت دووبارە بەرهەمەکە بڵاوبکەیتەوە.`
    }
  },

  // 4. Auction Ended - Reserve Not Met
  auction_ended_no_reserve: {
    ar: {
      title: "انتهى المزاد - لم يصل للسعر الاحتياطي",
      body: (data: { title: string; highestBid: number; reservePrice: number }) => 
        `انتهى المزاد على "${data.title}" بأعلى مزايدة ${data.highestBid.toLocaleString()} د.ع، لكنها لم تصل للسعر الاحتياطي ${data.reservePrice.toLocaleString()} د.ع`
    },
    ku: {
      title: "مزایدە تەواو بوو - نەگەیشتە نرخی پاشەکەوت",
      body: (data: { title: string; highestBid: number; reservePrice: number }) => 
        `مزایدەکە لەسەر "${data.title}" تەواو بوو بە بەرزترین مزایدەی ${data.highestBid.toLocaleString()} د.ع، بەڵام نەگەیشتە نرخی پاشەکەوت ${data.reservePrice.toLocaleString()} د.ع`
    }
  },

  // 5. Outbid
  outbid: {
    ar: {
      title: "تمت مزايدة أعلى منك",
      body: (data: { title: string; amount: number }) => 
        `شخص ما زايد بمبلغ ${data.amount.toLocaleString()} د.ع على "${data.title}"`
    },
    ku: {
      title: "مزایدەیەکی بەرزتر",
      body: (data: { title: string; amount: number }) => 
        `کەسێک ${data.amount.toLocaleString()} د.ع مزایدەی کرد لەسەر "${data.title}"`
    }
  },

  // 6. Auction Sold (Seller notification)
  auction_sold: {
    ar: {
      title: "تم بيع منتجك في المزاد! 🎉",
      body: (data: { title: string; amount: number; buyerName: string }) => 
        `تهانينا! تم بيع "${data.title}" بمبلغ ${data.amount.toLocaleString()} د.ع للمشتري ${data.buyerName}`
    },
    ku: {
      title: "بەرهەمەکەت فرۆشرا لە مزایدە! 🎉",
      body: (data: { title: string; amount: number; buyerName: string }) => 
        `پیرۆزە! "${data.title}" فرۆشرا بە ${data.amount.toLocaleString()} د.ع بۆ کڕیار ${data.buyerName}`
    }
  },

  // 7. New Message
  new_message: {
    ar: {
      title: "رسالة جديدة 💬",
      body: (data: { senderName: string; preview: string }) => 
        `${data.senderName}: ${data.preview}`
    },
    ku: {
      title: "نامەیەکی نوێ 💬",
      body: (data: { senderName: string; preview: string }) => 
        `${data.senderName}: ${data.preview}`
    }
  },

  // 8. Offer Received (Seller)
  offer_received: {
    ar: {
      title: "عرض سعر جديد",
      body: (data: { buyerName: string; amount: number; title: string }) => 
        `${data.buyerName} قدم عرض سعر ${data.amount.toLocaleString()} د.ع على "${data.title}"`
    },
    ku: {
      title: "پێشنیاری نرخی نوێ",
      body: (data: { buyerName: string; amount: number; title: string }) => 
        `${data.buyerName} پێشنیاری ${data.amount.toLocaleString()} د.ع کرد لەسەر "${data.title}"`
    }
  },

  // 9. Offer Accepted (Buyer)
  offer_accepted: {
    ar: {
      title: "تم قبول عرضك! 🎉",
      body: (data: { title: string; amount: number }) => 
        `تم قبول عرضك بمبلغ ${data.amount.toLocaleString()} د.ع على "${data.title}"`
    },
    ku: {
      title: "پێشنیارەکەت پەسەند کرا! 🎉",
      body: (data: { title: string; amount: number }) => 
        `پێشنیارەکەت بە ${data.amount.toLocaleString()} د.ع پەسەند کرا لەسەر "${data.title}"`
    }
  },

  // 10. Offer Rejected (Buyer)
  offer_rejected: {
    ar: {
      title: "تم رفض عرضك",
      body: (data: { title: string }) => 
        `تم رفض عرضك على "${data.title}". يمكنك تقديم عرض آخر.`
    },
    ku: {
      title: "پێشنیارەکەت ڕەتکرایەوە",
      body: (data: { title: string }) => 
        `پێشنیارەکەت لەسەر "${data.title}" ڕەتکرایەوە. دەتوانیت پێشنیارێکی تر بکەیت.`
    }
  },

  // 11. Payment Received (Seller)
  payment_received: {
    ar: {
      title: "تم استلام الدفع 💰",
      body: (data: { amount: number; orderNumber: string }) => 
        `تم استلام دفعة بمبلغ ${data.amount.toLocaleString()} د.ع للطلب #${data.orderNumber}`
    },
    ku: {
      title: "پارە وەرگیرا 💰",
      body: (data: { amount: number; orderNumber: string }) => 
        `پارەی ${data.amount.toLocaleString()} د.ع وەرگیرا بۆ داواکاری #${data.orderNumber}`
    }
  },

  // 12. Order Shipped (Buyer)
  order_shipped: {
    ar: {
      title: "تم شحن طلبك 📦",
      body: (data: { title: string; trackingNumber?: string }) => 
        data.trackingNumber 
          ? `تم شحن "${data.title}". رقم التتبع: ${data.trackingNumber}`
          : `تم شحن "${data.title}"`
    },
    ku: {
      title: "داواکارییەکەت نێردرا 📦",
      body: (data: { title: string; trackingNumber?: string }) => 
        data.trackingNumber 
          ? `"${data.title}" نێردرا. ژمارەی شوێنکەوتن: ${data.trackingNumber}`
          : `"${data.title}" نێردرا`
    }
  },

  // 13. Auction Ending Soon (20 minutes reminder)
  auction_ending_soon: {
    ar: {
      title: "المزاد ينتهي قريباً ⏰",
      body: (data: { title: string; minutesLeft: number }) => 
        `المزاد على "${data.title}" ينتهي خلال ${data.minutesLeft} دقيقة!`
    },
    ku: {
      title: "مزایدە بە زوویی تەواو دەبێت ⏰",
      body: (data: { title: string; minutesLeft: number }) => 
        `مزایدەکە لەسەر "${data.title}" لە ماوەی ${data.minutesLeft} خولەکدا تەواو دەبێت!`
    }
  },

  // 14. Saved Search Match
  saved_search_match: {
    ar: {
      title: "منتج جديد يطابق بحثك 🔍",
      body: (data: { title: string; searchQuery: string }) => 
        `منتج جديد يطابق بحث "${data.searchQuery}": ${data.title}`
    },
    ku: {
      title: "بەرهەمێکی نوێ کە لەگەڵ گەڕانەکەت دەگونجێت 🔍",
      body: (data: { title: string; searchQuery: string }) => 
        `بەرهەمێکی نوێ کە لەگەڵ "${data.searchQuery}" دەگونجێت: ${data.title}`
    }
  },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_MESSAGES;
export type Language = 'ar' | 'ku';

/**
 * Get notification message in user's language with fallback to Arabic
 */
export function getNotificationMessage(
  type: NotificationType,
  language: Language,
  data: any
): { title: string; body: string } {
  const messages = NOTIFICATION_MESSAGES[type];
  
  if (!messages) {
    console.error(`Unknown notification type: ${type}`);
    return { 
      title: language === 'ku' ? 'ئاگادارکردنەوە' : 'إشعار', 
      body: '' 
    };
  }
  
  // Use requested language, fallback to Arabic
  const langMessages = messages[language] || messages.ar;
  
  return {
    title: langMessages.title,
    body: typeof langMessages.body === 'function' 
      ? langMessages.body(data) 
      : langMessages.body
  };
}
