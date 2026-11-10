export const Welcome = () => {
    return (
        <section className="relative bg-[linear-gradient(to_bottom,#094A44_0%,#45726D_83%)] text-white flex items-center justify-center min-h-screen w-full overflow-hidden font-sans">
            
            {/* Decorative Top-Right Rings */}
            <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full border-[1px] border-[#D3A87C]/40 flex items-center justify-center pointer-events-none">
                <div className="w-[520px] h-[520px] rounded-full border-[1px] border-[#D3A87C]/50 flex items-center justify-center">
                    <div className="w-[440px] h-[440px] rounded-full bg-[#094A44] border-[1px] border-[#D3A87C]/30 shadow-inner"></div>
                </div>
            </div>

            {/* Decorative Bottom-Left Rings */}
            <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full border-[1px] border-[#D3A87C]/40 flex items-center justify-center pointer-events-none">
                <div className="w-[520px] h-[520px] rounded-full border-[1px] border-[#D3A87C]/50 flex items-center justify-center">
                    <div className="w-[440px] h-[440px] rounded-full bg-[#094A44] border-[1px] border-[#D3A87C]/30 shadow-inner"></div>
                </div>
            </div>

            {/* Center Card */}
            <div className="relative z-10 bg-[#FBE1CB] w-full max-w-[400px] rounded-xl px-8 py-12 flex flex-col items-center shadow-lg">
                <h1 className="text-2xl font-bold text-[#094A44] mb-1">
                    Welcome to Unslouch
                </h1>
                <p className="text-[#466963] text-base mb-8">
                    Let's get started!
                </p>

                <button className="w-full bg-[#4E7B74] text-white font-medium py-3 rounded-full hover:bg-[#3C645E] transition-colors mb-6">
                    Create Account
                </button>

                <button className="text-sm text-[#65847E] hover:text-[#094A44] transition-colors">
                    I already have an account
                </button>
            </div>
            
        </section>
    );
};