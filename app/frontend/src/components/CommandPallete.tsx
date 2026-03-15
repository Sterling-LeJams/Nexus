import CommandPalleteIcon from "../assets/commadpallete.svg";
import Button from "./Button";

function CommandPallete() {
  return (
    <Button
      title="Command Palette"
      className="absolute bottom-8 right-8 z-10"
    >
      <img src={CommandPalleteIcon} alt="Command Palette" className="w-5 h-5" />
    </Button>
  );
}

export default CommandPallete;
