import { motion } from "framer-motion";

export function SellingMethods() {
  return (
    <div className="w-full max-w-5xl mx-auto py-16 px-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-[#1F2937] mb-4">
          بع طريقتك: ٣ خيارات تناسب بضاعتك
        </h2>
        <p className="text-xl text-gray-500 font-medium">
          أدوات مرنة، ضمان مالي، وجمهور مختص.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <motion.div 
          whileHover={{ translateY: -5 }}
          className="bg-white rounded-[20px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full border-t-4 border-[#F59E0B]"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#FFF7ED] flex items-center justify-center text-[#F59E0B] mb-6">
            <i className="ph-duotone ph-gavel text-3xl"></i>
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-2xl font-bold text-[#1F2937]">المزاد العلني</h3>
            <span className="bg-[#FFF7ED] text-[#F59E0B] text-xs font-bold px-2 py-1 rounded-full">لأعلى سعر</span>
          </div>
          <p className="text-gray-500 leading-relaxed mt-auto">
            مثالي للقطع النادرة (الدعافيس). دع السوق يحدد السعر واصنع منافسة حية.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ translateY: -5 }}
          className="bg-white rounded-[20px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full border-t-4 border-[#8B5CF6]"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6] mb-6">
            <i className="ph-duotone ph-handshake text-3xl"></i>
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-2xl font-bold text-[#1F2937]">قدم عرضك</h3>
            <span className="bg-[#F5F3FF] text-[#8B5CF6] text-xs font-bold px-2 py-1 rounded-full">تفاوض</span>
          </div>
          <p className="text-gray-500 leading-relaxed mt-auto">
            استقبل عروض الأسعار من المشترين وفاوض للوصول للسعر المناسب.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ translateY: -5 }}
          className="bg-white rounded-[20px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full border-t-4 border-[#10B981]"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] flex items-center justify-center text-[#10B981] mb-6">
            <i className="ph-duotone ph-lightning text-3xl"></i>
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-2xl font-bold text-[#1F2937]">اشتر الآن</h3>
            <span className="bg-[#ECFDF5] text-[#10B981] text-xs font-bold px-2 py-1 rounded-full">فوري</span>
          </div>
          <p className="text-gray-500 leading-relaxed mt-auto">
            حدد سعرك الثابت وبع فوراً. مثالي للمنتجات ذات الطلب العالي.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
