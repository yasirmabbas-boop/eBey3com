import { motion } from "framer-motion";

export function SellerHub() {
  return (
    <div className="w-full max-w-5xl mx-auto py-16 px-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-[#1F2937] mb-4">
          لماذا تبيع معنا؟
        </h2>
        <p className="text-xl text-gray-500 font-medium">
          أدوات احترافية. عمولة صفرية. راحة بال.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        <div className="bg-white rounded-[24px] p-8 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative min-w-max md:min-w-0">
            <motion.div 
              whileHover={{ translateY: -5 }}
              className="flex flex-col items-center gap-4 text-center z-10"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#4F46E5]">
                <i className="ph-duotone ph-camera text-4xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#1F2937]">صور وانشر</h3>
            </motion.div>

            <div className="hidden md:flex text-gray-300">
              <i className="ph-light ph-caret-left text-3xl"></i>
            </div>

            <motion.div 
              whileHover={{ translateY: -5 }}
              className="flex flex-col items-center gap-4 text-center z-10"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#4F46E5]">
                <i className="ph-duotone ph-gear text-4xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#1F2937]">النظام يدير</h3>
            </motion.div>

            <div className="hidden md:flex text-gray-300">
              <i className="ph-light ph-caret-left text-3xl"></i>
            </div>

            <motion.div 
              whileHover={{ translateY: -5 }}
              className="flex flex-col items-center gap-4 text-center z-10"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#4F46E5]">
                <i className="ph-duotone ph-shopping-cart text-4xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#1F2937]">المشتري يشتري</h3>
            </motion.div>

            <div className="hidden md:flex text-gray-300">
              <i className="ph-light ph-caret-left text-3xl"></i>
            </div>

            <motion.div 
              whileHover={{ translateY: -5 }}
              className="flex flex-col items-center gap-4 text-center z-10"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#4F46E5]">
                <i className="ph-duotone ph-truck text-4xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#1F2937]">اشحن فوراً</h3>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            whileHover={{ translateY: -5 }}
            className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] flex items-center justify-center text-[#10B981] shrink-0">
              <i className="ph-duotone ph-percent text-3xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1F2937] mb-1">عمولة صفرية</h3>
              <p className="text-gray-500 text-sm">أول ١٠٠ منتج مجاناً</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ translateY: -5 }}
            className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] shrink-0">
              <i className="ph-duotone ph-shield-check text-3xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1F2937] mb-1">مستخدمين موثقين فقط</h3>
              <p className="text-gray-500 text-sm">أرقام هواتف عراقية</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ translateY: -5 }}
            className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] shrink-0">
              <i className="ph-duotone ph-chart-pie-slice text-3xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1F2937] mb-1">تحكم كامل بالمبيعات</h3>
              <p className="text-gray-500 text-sm">لوحة تحكم ذكية وشاملة</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ translateY: -5 }}
            className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] shrink-0">
              <i className="ph-duotone ph-rocket text-3xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1F2937] mb-1">شحن سريع وآمن</h3>
              <p className="text-gray-500 text-sm">عبر شركات توصيل معتمدة بأسعار خاصة</p>
            </div>
          </motion.div>
        </div>

        <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-[24px] p-8 md:p-12 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-4">
            <i className="ph-duotone ph-share-network text-4xl"></i>
          </div>
          <h3 className="text-2xl font-bold mb-3">شارك منتجاتك مع متابعيك</h3>
          <p className="text-white/90 max-w-xl mx-auto">
            انشر روابط منتجاتك على حساباتك في وسائل التواصل الاجتماعي واجذب المزيد من المشترين
          </p>
        </div>
      </div>
    </div>
  );
}
