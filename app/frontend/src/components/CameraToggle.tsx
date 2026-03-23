import { useViewerStore } from "../store/viewerStore";
import CameraSvg from "../assets/camera-outlined-svgrepo-com.svg";

function CameraToggle() {
  const { cameraMode, setCameraMode } = useViewerStore();
  const isPerspective = cameraMode === "perspective";

  const toggle = () => {
    setCameraMode(isPerspective ? "ortho" : "perspective");
  };

  return (
    <button
      title={isPerspective ? "Perspective" : "Orthographic"}
      onClick={toggle}
      className="relative w-14 h-8 rounded-lg bg-gray-200/60 hover:bg-gray-200/80 transition-colors cursor-pointer flex items-center"
    >
      {/* Sliding knob */}
      <div
        className="absolute w-7 h-7 rounded-md bg-white shadow-md flex items-center justify-center transition-all duration-200 ease-in-out"
        style={{ left: isPerspective ? "calc(100% - 28.5px)" : "1.5px" }}
      >
        <div className="relative w-5 h-5">
          <img src={CameraSvg} alt="Camera" className="w-5 h-5" />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700 mt-[1px]">
            {isPerspective ? "P" : "O"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default CameraToggle;
