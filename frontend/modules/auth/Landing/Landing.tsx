import Link from "next/link";

export const Landing = () => {
  return (
    <div className="relative h-screen w-full bg-[#1B433A] overflow-hidden font-sans">
      {/* Decorative Circles - Top Right */}
      <div className="absolute -top-12 -right-20 w-80 h-80 rounded-full border-[1.5px] border-[#FADFCA] opacity-70 pointer-events-none"></div>
      <div className="absolute -top-24 -right-32 w-[28rem] h-[28rem] rounded-full border-[1.5px] border-[#FADFCA] opacity-70 pointer-events-none"></div>

      {/* Decorative Circles - Middle Left */}
      <div className="absolute top-[20%] -left-32 w-[26rem] h-[26rem] rounded-full border-[1.5px] border-[#FADFCA] opacity-70 pointer-events-none"></div>
      <div className="absolute top-[15%] -left-44 w-[34rem] h-[34rem] rounded-full border-[1.5px] border-[#FADFCA] opacity-70 pointer-events-none"></div>

      {/* Bottom Content Card */}
      <div className="absolute bottom-0 w-full h-[40%] bg-[#FCE5D2] rounded-t-3xl flex flex-col items-center pt-16 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        {/* Headings */}
        <div className="text-center mb-12">
          <h1 className="text-[28px] font-extrabold text-[#0D3830] tracking-tight">
            Welcome to Unslouch
          </h1>
          <p className="text-[22px] text-[#0D3830] mt-1 font-normal">
            Let's get started!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
            
          <Link href='./register' className="w-full text-center bg-[#46736A] text-white py-4 rounded-[1.25rem] text-[17px] font-medium tracking-wide hover:bg-[#3B6159] transition-colors active:scale-[0.98]">
            Create Account
          </Link>

          <Link href='./login' className="text-[#46736A] text-[15px] font-medium hover:text-[#0D3830] transition-colors">
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
};
