import homeIcon from "../assets/home.svg";

function Home() {
  return (
    <button
      title="Home"
      aria-label="Home"
      className="absolute top-[calc(1rem+15%)] right-[calc(1rem+10%)] bg-transparent border-none opacity-60 hover:opacity-100 transition-opacity cursor-pointer p-0"
    >
      <img src={homeIcon} alt="Home" className="w-6 h-6" />
    </button>
  );
}

export default Home;
