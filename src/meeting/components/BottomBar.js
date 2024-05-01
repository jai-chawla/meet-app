
import { Constants, useMeeting, usePubSub, useMediaDevice } from "@videosdk.live/react-sdk";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardIcon,
  CheckIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
} from "@heroicons/react/outline";
import recordingBlink from "../../static/animations/recording-blink.json";
import useIsRecording from "../../hooks/useIsRecording";
import RecordingIcon from "../../icons/Bottombar/RecordingIcon";
import MicOnIcon from "../../icons/Bottombar/MicOnIcon";
import MicOffIcon from "../../icons/Bottombar/MicOffIcon";
import WebcamOnIcon from "../../icons/Bottombar/WebcamOnIcon";
import WebcamOffIcon from "../../icons/Bottombar/WebcamOffIcon";
import ScreenShareIcon from "../../icons/Bottombar/ScreenShareIcon";
import ChatIcon from "../../icons/Bottombar/ChatIcon";
import ParticipantsIcon from "../../icons/Bottombar/ParticipantsIcon";
import EndIcon from "../../icons/Bottombar/EndIcon";
import RaiseHandIcon from "../../icons/Bottombar/RaiseHandIcon";
import WhiteBoard from "../../icons/Bottombar/WhiteBoard";
import PipIcon from "../../icons/Bottombar/PipIcon";
import { OutlinedButton } from "../../components/buttons/OutlinedButton";
import useIsTab from "../../hooks/useIsTab";
import useIsMobile from "../../hooks/useIsMobile";
import { MobileIconButton } from "../../components/buttons/MobileIconButton";
import { sideBarModes } from "../../utils/common";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { createPopper } from "@popperjs/core";
import { useMeetingAppContext } from "../../MeetingAppContextDef";
import useMediaStream from "../../hooks/useMediaStream";


function PipBTN({ isMobile, isTab }) {
  const { pipMode, setPipMode } = useMeetingAppContext();

  const getRowCount = (length) => {
    return length > 2 ? 2 : length > 0 ? 1 : 0;
  };
  const getColCount = (length) => {
    return length < 2 ? 1 : length < 5 ? 2 : 3;
  };

  const pipWindowRef = useRef(null);
  const togglePipMode = async () => {
    //Check if PIP Window is active or not
    //If active we will turn it off
    if (pipWindowRef.current) {
      await document.exitPictureInPicture();
      pipWindowRef.current = null;
      return;
    }

    //Check if browser supports PIP mode else show a message to user
    if ("pictureInPictureEnabled" in document) {
      //Creating a Canvas which will render our PIP Stream
      const source = document.createElement("canvas");
      const ctx = source.getContext("2d");

      //Create a Video tag which we will popout for PIP
      const pipVideo = document.createElement("video");
      pipWindowRef.current = pipVideo;
      pipVideo.autoplay = true;

      //Creating stream from canvas which we will play
      const stream = source.captureStream();
      pipVideo.srcObject = stream;
      drawCanvas();

      //When Video is ready we will start PIP mode
      pipVideo.onloadedmetadata = () => {
        pipVideo.requestPictureInPicture();
      };
      await pipVideo.play();

      //When the PIP mode starts, we will start drawing canvas with PIP view
      pipVideo.addEventListener("enterpictureinpicture", (event) => {
        drawCanvas();
        setPipMode(true);
      });

      //When PIP mode exits, we will dispose the track we created earlier
      pipVideo.addEventListener("leavepictureinpicture", (event) => {
        pipWindowRef.current = null;
        setPipMode(false);
        pipVideo.srcObject.getTracks().forEach((track) => track.stop());
      });

      //These will draw all the video elements in to the Canvas
      function drawCanvas() {
        //Getting all the video elements in the document
        const videos = document.querySelectorAll("video");
        try {
          //Perform initial black paint on the canvas
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, source.width, source.height);

          //Drawing the participant videos on the canvas in the grid format
          const rows = getRowCount(videos.length);
          const columns = getColCount(videos.length);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns; j++) {
              if (j + i * columns <= videos.length || videos.length === 1) {
                ctx.drawImage(
                  videos[j + i * columns],
                  j < 1 ? 0 : source.width / (columns / j),
                  i < 1 ? 0 : source.height / (rows / i),
                  source.width / columns,
                  source.height / rows
                );
              }
            }
          }
        } catch (error) {
          console.log(error);
        }

        //If pip mode is on, keep drawing the canvas when ever new frame is requested
        if (document.pictureInPictureElement === pipVideo) {
          requestAnimationFrame(drawCanvas);
        }
      }
    } else {
      alert("PIP is not supported by your browser");
    }
  };

  return isMobile || isTab ? (
    <MobileIconButton
      id="pip-btn"
      tooltipTitle={pipMode ? "Stop PiP" : "Start Pip"}
      buttonText={pipMode ? "Stop PiP" : "Start Pip"}
      isFocused={pipMode}
      Icon={PipIcon}
      onClick={() => {
        togglePipMode();
      }}
      disabled={false}
    />
  ) : (
    <OutlinedButton
      Icon={PipIcon}
      onClick={() => {
        togglePipMode();
      }}
      isFocused={pipMode}
      tooltip={pipMode ? "Stop PiP" : "Start Pip"}
      disabled={false}
    />
  );
}

const MicBTN = () => {
  const {
    selectedMic,
    setSelectedMic,
    selectedSpeaker,
    setSelectedSpeaker,
    isMicrophonePermissionAllowed
  } = useMeetingAppContext()

  const {
     getMicrophones, getPlaybackDevices
  } = useMediaDevice();

  const mMeeting = useMeeting();
  const [mics, setMics] = useState([]);
  const [speakers, setSpeakers] = useState([])
  const localMicOn = mMeeting?.localMicOn;
  const changeMic = mMeeting?.changeMic;

  const getMics = async () => {
    const mics = await getMicrophones();
    const speakers = await getPlaybackDevices();

    mics && mics?.length && setMics(mics);
    speakers && speakers?.length && setSpeakers(speakers)
  };

  const [tooltipShow, setTooltipShow] = useState(false);
  const btnRef = useRef();
  const tooltipRef = useRef();

  const openTooltip = () => {
    createPopper(btnRef.current, tooltipRef.current, {
      placement: "top",
    });
    setTooltipShow(true);
  };
  const closeTooltip = () => {
    setTooltipShow(false);
  };
  return (
    <>
      <OutlinedButton
        Icon={localMicOn ? MicOnIcon : MicOffIcon}
        onClick={() => { mMeeting.toggleMic() }}
        bgColor={localMicOn ? "bg-gray-750" : "bg-white"}
        borderColor={localMicOn && "#ffffff33"}
        isFocused={localMicOn}
        focusIconColor={localMicOn && "white"}
        tooltip={"Toggle Mic"}
        renderRightComponent={() => {
          return (
            <>
              <Popover className="relative">
                {({ close }) => (
                  <>
                    <Popover.Button disabled={!isMicrophonePermissionAllowed} className="flex items-center justify-center mt-1 mr-1 focus:outline-none">
                      <div
                        ref={btnRef}
                        onMouseEnter={openTooltip}
                        onMouseLeave={closeTooltip}
                      >
                        <button
                          onClick={() => { getMics() }}
                        >
                          <ChevronDownIcon
                            className="h-4 w-4"
                            style={{
                              color: mMeeting.localMicOn ? "white" : "black",
                            }}
                          />
                        </button>
                      </div>
                    </Popover.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1"
                    >
                      <Popover.Panel className="absolute left-1/2 bottom-full z-10 mt-3 w-72 -translate-x-1/2 transform px-4 sm:px-0 pb-4">
                        <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className={" bg-gray-750 py-1"}>
                            <div>
                              <div className="flex items-center p-3 pb-0">
                                <p className="ml-3 text-sm text-gray-900">
                                  {"MICROPHONE"}
                                </p>
                              </div>
                              <div className="flex flex-col">
                                {mics.map(({ deviceId, label }, index) => (
                                  <div
                                    className={`px-3 py-1 my-1 pl-6 text-white text-left ${deviceId === selectedMic.id &&
                                      "bg-gray-150"
                                      }`}
                                  >
                                    <button
                                      className={`flex flex-1 w-full text-left ${deviceId === selectedMic.id &&
                                        "bg-gray-150"
                                        }`}
                                      key={`mics_${deviceId}`}
                                      onClick={() => {
                                        setSelectedMic({ id: deviceId });
                                        changeMic(deviceId);
                                        close();
                                      }}
                                    >
                                      {label || `Mic ${index + 1}`}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <hr className='border border-gray-50 mt-2 mb-1' />
                            <div>
                              <div className="flex p-3 pb-0">
                                <p className="ml-3 text-sm text-gray-900  text-center">
                                  {"SPEAKER"}
                                </p>
                              </div>
                              <div className="flex flex-col ">
                                {speakers.map(({ deviceId, label }, index) => (
                                  <div
                                    className={`px-3 py-1 my-1 pl-6 text-white ${deviceId === selectedSpeaker.id &&
                                      "bg-gray-150"
                                      }`}
                                  >
                                    <button
                                      className={`flex flex-1 w-full text-left ${deviceId === selectedSpeaker.id &&
                                        "bg-gray-150"
                                        }`}
                                      key={`speakers_${deviceId}`}
                                      onClick={() => {
                                        setSelectedSpeaker({ id: deviceId });
                                        close();
                                      }}
                                    >
                                      {label || `Speaker ${index + 1}`}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>

                      </Popover.Panel>
                    </Transition>
                  </>
                )}
              </Popover>
              <div
                style={{ zIndex: 999 }}
                className={`${tooltipShow ? "" : "hidden"
                  } overflow-hidden flex flex-col items-center justify-center pb-4`}
                ref={tooltipRef}
              >
                <div className={"rounded-md p-1.5 bg-black "}>
                  <p className="text-base text-white ">
                    {"Change microphone"}
                  </p>
                </div>
              </div>
            </>
          );
        }}
      />
    </>
  );
};

const WebCamBTN = () => {
  const {
    selectedWebcam,
    setSelectedWebcam,
    isCameraPermissionAllowed,
  } = useMeetingAppContext()
  const {getCameras} = useMediaDevice();
  const mMeeting = useMeeting();
  const [webcams, setWebcams] = useState([]);
  const { getVideoTrack } = useMediaStream();

  const localWebcamOn = mMeeting?.localWebcamOn;
  const changeWebcam = mMeeting?.changeWebcam;

  const getWebcams = async () => {
    let webcams = await getCameras();
    webcams && webcams?.length && setWebcams(webcams);
  };

  const [tooltipShow, setTooltipShow] = useState(false);
  const btnRef = useRef();
  const tooltipRef = useRef();

  const openTooltip = () => {
    createPopper(btnRef.current, tooltipRef.current, {
      placement: "top",
    });
    setTooltipShow(true);
  };
  const closeTooltip = () => {
    setTooltipShow(false);
  };

  return (
    <>
      <OutlinedButton
        Icon={localWebcamOn ? WebcamOnIcon : WebcamOffIcon}
        onClick={async () => {
          let track;
          if (!localWebcamOn) {
            track = await getVideoTrack({
              webcamId: selectedWebcam.id
            });
          }
          mMeeting.toggleWebcam(track);
        }}
        bgColor={localWebcamOn ? "bg-gray-750" : "bg-white"}
        borderColor={localWebcamOn && "#ffffff33"}
        isFocused={localWebcamOn}
        focusIconColor={localWebcamOn && "white"}
        tooltip={"Toggle Webcam"}
        renderRightComponent={() => {
          return (
            <>
              <Popover className="relative">
                {({ close }) => (
                  <>
                    <Popover.Button disabled={!isCameraPermissionAllowed} className="flex items-center justify-center mt-1 mr-1 focus:outline-none">
                      <div
                        ref={btnRef}
                        onMouseEnter={openTooltip}
                        onMouseLeave={closeTooltip}
                      >
                        <button
                          onClick={() => { getWebcams() }}
                        >
                          <ChevronDownIcon
                            className="h-4 w-4"
                            style={{
                              color: localWebcamOn ? "white" : "black",
                            }}
                          />
                        </button>
                      </div>
                    </Popover.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1"
                    >
                      <Popover.Panel className="absolute left-1/2 bottom-full z-10 mt-3 w-72 -translate-x-1/2 transform px-4 sm:px-0 pb-4">
                        <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className={" bg-gray-750 py-1"}>
                            <div>
                              <div className="flex items-center p-3 pb-0">
                                <p className="ml-3 text-sm text-gray-900">
                                  {"WEBCAM"}
                                </p>
                              </div>
                              <div className="flex flex-col">
                                {webcams.map(({ deviceId, label }, index) => (
                                  <div
                                    className={`px-3 py-1 my-1 pl-6 text-white ${deviceId === selectedWebcam.id &&
                                      "bg-gray-150"
                                      }`}
                                  >
                                    <button
                                      className={`flex flex-1 w-full text-left ${deviceId === selectedWebcam.id &&
                                        "bg-gray-150"
                                        }`}
                                      key={`output_webcams_${deviceId}`}
                                      onClick={() => {
                                        setSelectedWebcam({ id: deviceId });
                                        changeWebcam(deviceId);
                                        close();
                                      }}
                                    >
                                      {label || `Webcam ${index + 1}`}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popover.Panel>
                    </Transition>
                  </>
                )}
              </Popover>
              <div
                style={{ zIndex: 999 }}
                className={`${tooltipShow ? "" : "hidden"
                  } overflow-hidden flex flex-col items-center justify-center pb-4`}
                ref={tooltipRef}
              >
                <div className={"rounded-md p-1.5 bg-black "}>
                  <p className="text-base text-white ">{"Change webcam"}</p>
                </div>
              </div>
            </>
          );
        }}
      />
    </>
  );
};

export function BottomBar({
  bottomBarHeight,
  setIsMeetingLeft
}) {
 
  const { sideBarMode, setSideBarMode } = useMeetingAppContext();
  const RaiseHandBTN = ({ isMobile, isTab }) => {
    const { publish } = usePubSub("RAISE_HAND");
    const RaiseHand = () => {
      publish("Raise Hand");
    };

    return isMobile || isTab ? (
      <MobileIconButton
        id="RaiseHandBTN"
        tooltipTitle={"Raise hand"}
        Icon={RaiseHandIcon}
        onClick={RaiseHand}
        buttonText={"Raise Hand"}
      />
    ) : (
      <OutlinedButton
        onClick={RaiseHand}
        tooltip={"Raise Hand"}
        Icon={RaiseHandIcon}
      />
    );
  };

  const RecordingBTN = () => {
    const { startRecording, stopRecording, recordingState } = useMeeting();
    const defaultOptions = {
      loop: true,
      autoplay: true,
      animationData: recordingBlink,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
      },
      height: 64,
      width: 160,
    };

    const isRecording = useIsRecording();
    const isRecordingRef = useRef(isRecording);

    useEffect(() => {
      isRecordingRef.current = isRecording;
    }, [isRecording]);

    const { isRequestProcessing } = useMemo(
      () => ({
        isRequestProcessing:
          recordingState === Constants.recordingEvents.RECORDING_STARTING ||
          recordingState === Constants.recordingEvents.RECORDING_STOPPING,
      }),
      [recordingState]
    );

    const _handleClick = () => {
      const isRecording = isRecordingRef.current;

      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    return (
      <OutlinedButton
        Icon={RecordingIcon}
        onClick={_handleClick}
        isFocused={isRecording}
        tooltip={
          recordingState === Constants.recordingEvents.RECORDING_STARTED
            ? "Stop Recording"
            : recordingState === Constants.recordingEvents.RECORDING_STARTING
              ? "Starting Recording"
              : recordingState === Constants.recordingEvents.RECORDING_STOPPED
                ? "Start Recording"
                : recordingState === Constants.recordingEvents.RECORDING_STOPPING
                  ? "Stopping Recording"
                  : "Start Recording"
        }
        lottieOption={isRecording ? defaultOptions : null}
        isRequestProcessing={isRequestProcessing}
      />
    );
  };

 

  const ScreenShareBTN = ({ isMobile, isTab }) => {
    const { localScreenShareOn, toggleScreenShare, presenterId } = useMeeting();

    return isMobile || isTab ? (
      <MobileIconButton
        id="screen-share-btn"
        tooltipTitle={
          presenterId
            ? localScreenShareOn
              ? "Stop Presenting"
              : null
            : "Present Screen"
        }
        buttonText={
          presenterId
            ? localScreenShareOn
              ? "Stop Presenting"
              : null
            : "Present Screen"
        }
        isFocused={localScreenShareOn}
        Icon={ScreenShareIcon}
        onClick={() => {
          toggleScreenShare();
        }}
        disabled={
          presenterId
            ? localScreenShareOn
              ? false
              : true
            : isMobile
              ? true
              : false
        }
      />
    ) : (
      <OutlinedButton
        Icon={ScreenShareIcon}
        onClick={() => {
          toggleScreenShare();
        }}
        isFocused={localScreenShareOn}
        tooltip={
          presenterId
            ? localScreenShareOn
              ? "Stop Presenting"
              : null
            : "Present Screen"
        }
        disabled={presenterId ? (localScreenShareOn ? false : true) : false}
      />
    );
  };

  const LeaveBTN = () => {
    const { leave } = useMeeting();

    return (
      <OutlinedButton
        Icon={EndIcon}
        bgColor="bg-red-150"
        onClick={() => {
          leave();
          setIsMeetingLeft(true);
        }}
        tooltip="Leave Meeting"
      />
    );
  };

  const ChatBTN = ({ isMobile, isTab }) => {
    return isMobile || isTab ? (
      <MobileIconButton
        tooltipTitle={"Chat"}
        buttonText={"Chat"}
        Icon={ChatIcon}
        isFocused={sideBarMode === sideBarModes.CHAT}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.CHAT ? null : sideBarModes.CHAT
          );
        }}
      />
    ) : (
      <OutlinedButton
        Icon={ChatIcon}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.CHAT ? null : sideBarModes.CHAT
          );
        }}
        isFocused={sideBarMode === "CHAT"}
        tooltip="View Chat"
      />
    );
  };

  const ParticipantsBTN = ({ isMobile, isTab }) => {
    const { participants } = useMeeting();
    return isMobile || isTab ? (
      <MobileIconButton
        tooltipTitle={"Participants"}
        isFocused={sideBarMode === sideBarModes.PARTICIPANTS}
        buttonText={"Participants"}
        disabledOpacity={1}
        Icon={ParticipantsIcon}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.PARTICIPANTS ? null : sideBarModes.PARTICIPANTS
          );
        }}
        badge={`${new Map(participants)?.size}`}
      />
    ) : (
      <OutlinedButton
        Icon={ParticipantsIcon}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.PARTICIPANTS ? null : sideBarModes.PARTICIPANTS
          );
        }}
        isFocused={sideBarMode === sideBarModes.PARTICIPANTS}
        tooltip={"View \nParticipants"}
        badge={`${new Map(participants)?.size}`}
      />
    );
  };

  const MeetingIdCopyBTN = () => {
    const { meetingId } = useMeeting();
    const [isCopied, setIsCopied] = useState(false);
    return (
      <div className="flex items-center justify-center lg:ml-0 ml-4 mt-4 xl:mt-0">
        <div className="flex border-2 border-gray-850 p-2 rounded-md items-center justify-center">
          <h1 className="text-white text-base ">{meetingId}</h1>
          <button
            className="ml-2"
            onClick={() => {
              navigator.clipboard.writeText(meetingId);
              setIsCopied(true);
              setTimeout(() => {
                setIsCopied(false);
              }, 3000);
            }}
          >
            {isCopied ? (
              <CheckIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ClipboardIcon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>
    );
  };

  const tollTipEl = useRef();
  const isMobile = useIsMobile();
  const isTab = useIsTab();
  const [open, setOpen] = useState(false);

  const handleClickFAB = () => {
    setOpen(true);
  };

  const handleCloseFAB = () => {
    setOpen(false);
  };

  const BottomBarButtonTypes = useMemo(
    () => ({
      END_CALL: "END_CALL",
      CHAT: "CHAT",
      PARTICIPANTS: "PARTICIPANTS",
      SCREEN_SHARE: "SCREEN_SHARE",
      WEBCAM: "WEBCAM",
      MIC: "MIC",
      RAISE_HAND: "RAISE_HAND",
      RECORDING: "RECORDING",
      PIP: "PIP",
      MEETING_ID_COPY: "MEETING_ID_COPY",
    }),
    []
  );

  const otherFeatures = [
    { icon: BottomBarButtonTypes.RAISE_HAND },
    { icon: BottomBarButtonTypes.PIP },
    { icon: BottomBarButtonTypes.SCREEN_SHARE },
    { icon: BottomBarButtonTypes.CHAT },
    { icon: BottomBarButtonTypes.PARTICIPANTS },
    { icon: BottomBarButtonTypes.MEETING_ID_COPY },
  ];

  return isMobile || isTab ? (
    <div
      className="flex items-center justify-center"
      style={{ height: bottomBarHeight }}
    >
      <LeaveBTN />
      <MicBTN />
      <WebCamBTN />
      <RecordingBTN />
      <OutlinedButton Icon={DotsHorizontalIcon} onClick={handleClickFAB} />
      <Transition appear show={Boolean(open)} as={Fragment}>
        <Dialog
          as="div"
          className="relative"
          style={{ zIndex: 9999 }}
          onClose={handleCloseFAB}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-y-full opacity-0 scale-95"
            enterTo="translate-y-0 opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0 opacity-100 scale-100"
            leaveTo="translate-y-full opacity-0 scale-95"
          >
            <div className="fixed inset-0 overflow-y-hidden">
              <div className="flex h-full items-end justify-end text-center">
                <Dialog.Panel className="w-screen transform overflow-hidden bg-gray-800 shadow-xl transition-all">
                  <div className="grid container bg-gray-800 py-6">
                    <div className="grid grid-cols-12 gap-2">
                      {otherFeatures.map(({ icon }) => {
                        return (
                          <div
                            className={`grid items-center justify-center ${icon === BottomBarButtonTypes.MEETING_ID_COPY
                              ? "col-span-7 sm:col-span-5 md:col-span-3"
                              : "col-span-4 sm:col-span-3 md:col-span-2"
                              }`}
                          >
                            {icon === BottomBarButtonTypes.RAISE_HAND ? (
                              <RaiseHandBTN isMobile={isMobile} isTab={isTab} />
                            ) : icon === BottomBarButtonTypes.SCREEN_SHARE ? (
                              <ScreenShareBTN
                                isMobile={isMobile}
                                isTab={isTab}
                              />
                            ) : icon === BottomBarButtonTypes.CHAT ? (
                              <ChatBTN isMobile={isMobile} isTab={isTab} />
                            ) : icon === BottomBarButtonTypes.PARTICIPANTS ? (
                              <ParticipantsBTN
                                isMobile={isMobile}
                                isTab={isTab}
                              />
                            ) : icon ===
                              BottomBarButtonTypes.MEETING_ID_COPY ? (
                              <MeetingIdCopyBTN
                                isMobile={isMobile}
                                isTab={isTab}
                              />
                            ) : icon === BottomBarButtonTypes.PIP ? (
                              <PipBTN isMobile={isMobile} isTab={isTab} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Dialog.Panel>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    </div>
  ) : (
    <div className="md:flex lg:px-2 xl:px-6 pb-2 px-2 hidden">
      <MeetingIdCopyBTN />

      <div className="flex flex-1 items-center justify-center" ref={tollTipEl}>
      
      
      
      <a target="_blank" href="https://white-board-iota.vercel.app" className=" my-2 text-gray-900 bg-white border border-gray-300 focus:border-white hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-750 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700" title="WHITE BOARD">

      <svg
      viewBox="0 0 448 512"
      fill="currentColor"
      height="1.5em"
      width="1.5em"
      
    >
      <path d="M96 151.4v209.2c9.7 5.6 17.8 13.7 23.4 23.4h209.2c0-.1.1-.2.1-.3l-4.5-7.9-32-56c-1.4.1-2.8.1-4.2.1-35.3 0-64-28.7-64-64s28.7-64 64-64c1.4 0 2.8 0 4.2.1l32-56 4.5-7.9-.1-.3H119.4c-5.6 9.7-13.7 17.8-23.4 23.4zM384.3 352c35.2.2 63.7 28.7 63.7 64s-28.7 64-64 64c-23.7 0-44.4-12.9-55.4-32H119.4c-11.1 19.1-31.7 32-55.4 32-35.3 0-64-28.7-64-64 0-23.7 12.9-44.4 32-55.4V151.4C12.9 140.4 0 119.7 0 96c0-35.3 28.7-64 64-64 23.7 0 44.4 12.9 55.4 32h209.2c11.1-19.1 31.7-32 55.4-32 35.3 0 64 28.7 64 64s-28.5 63.8-63.7 64l-4.5 7.9-32 56-2.3 4c4.2 8.5 6.5 18 6.5 28.1s-2.3 19.6-6.5 28.1l2.3 4 32 56 4.5 7.9z" />
    </svg>

      </a>

      <a target="_blank" href="https://video-conferencing-kappa.vercel.app" className=" my-2 text-gray-900 bg-white border border-gray-300 focus:border-white hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-750 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700" title="Attendance">
      <svg
      viewBox="0 0 640 512"
      fill="currentColor"
      height="1.5em"
      width="1.5em"
     
    >
      <path d="M184 88c0 30.9-25.1 56-56 56s-56-25.1-56-56 25.1-56 56-56 56 25.1 56 56zM64 245.7c-10 11.2-16 26.1-16 42.3s6 31.1 16 42.3v-84.6zm144.4-49.3C178.7 222.7 160 261.2 160 304c0 34.3 12 65.8 32 90.5V416c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32v-26.8C26.2 371.2 0 332.7 0 288c0-61.9 50.1-112 112-112h32c24 0 46.2 7.5 64.4 20.3zM448 416v-21.5c20-24.7 32-56.2 32-90.5 0-42.8-18.7-81.3-48.4-107.7C449.8 183.5 472 176 496 176h32c61.9 0 112 50.1 112 112 0 44.7-26.2 83.2-64 101.2V416c0 17.7-14.3 32-32 32h-64c-17.7 0-32-14.3-32-32zM568 88c0 30.9-25.1 56-56 56s-56-25.1-56-56 25.1-56 56-56 56 25.1 56 56zm8 157.7v84.7c10-11.3 16-26.1 16-42.3s-6-31.1-16-42.3zM320 160c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm-80 144c0 16.2 6 31 16 42.3v-84.6c-10 11.3-16 26.1-16 42.3zm144-42.3v84.7c10-11.3 16-26.1 16-42.3s-6-31.1-16-42.3zm64 42.3c0 44.7-26.2 83.2-64 101.2V448c0 17.7-14.3 32-32 32h-64c-17.7 0-32-14.3-32-32v-42.8c-37.8-18-64-56.5-64-101.2 0-61.9 50.1-112 112-112h32c61.9 0 112 50.1 112 112z" />
    </svg>
      </a>
        <RecordingBTN />
        <RaiseHandBTN isMobile={isMobile} isTab={isTab} />
        <MicBTN />
        <WebCamBTN />
        <ScreenShareBTN isMobile={isMobile} isTab={isTab} />
        <PipBTN isMobile={isMobile} isTab={isTab} />
        <LeaveBTN />
      </div>
      <div className="flex items-center justify-center">
        <ChatBTN isMobile={isMobile} isTab={isTab} />
        <ParticipantsBTN isMobile={isMobile} isTab={isTab} />
      </div>
    </div>
  );
}
