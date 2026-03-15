import CommandPalleteIcon from "../assets/commadpallete.svg";

function CommandPallete() {
  return (
    <button
      title="Command Palette"
      className="absolute bottom-8 right-8 z-10 px-3 py-2 rounded-xl shadow-lg hover:bg-white/70 transition-colors cursor-pointer"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
    >
      <img src={CommandPalleteIcon} alt="Command Palette" className="w-5 h-5" />
    </button>
  );
}

export default CommandPallete;
