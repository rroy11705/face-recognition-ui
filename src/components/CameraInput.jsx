/* eslint-disable react-hooks/exhaustive-deps */
import {
  faCamera,
  faCheck,
  faRefresh,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import * as faceapi from "face-api.js";
import { throttle } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import Modal from "react-modal";
import { Buffer } from "buffer";

const CameraInput = ({ name, opened, close }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [deviceCameraDimensions, setDeviceCameraDimensions] = useState({
    width: 640,
    height: 480,
  });
  const [isHumanInsideSilhouette, setIsHumanInsideSilhouette] = useState(false);
  const [humanFace, setHumanFace] = useState();
  const [humanCaptured, setHumanCaptured] = useState(false);

  const form = useFormContext();

  const file = form.watch(name);

  useEffect(() => {
    if (!opened) {
      setIsHumanInsideSilhouette(false);
      setHumanFace(undefined);
      setHumanCaptured(false);
    }
  }, [opened]);

  useEffect(() => {
    if (humanFace && humanFace.length > 1) {
      const show = () =>
        console.log("Only one person is allowed in the frame.");
      const multipleHumanError = throttle(() => show(), 5000);
      multipleHumanError();
    }
    if (
      humanFace &&
      humanFace.length === 1 &&
      humanFace[0] instanceof faceapi.FaceDetection
    ) {
      const reductionFactor = canvasRef?.current?.getBoundingClientRect()
        ? canvasRef.current.getBoundingClientRect().width / 640
        : 1;
      const { height, width, x, y } = humanFace[0]._box;
      const silhouette = document.getElementById("silhouette");
      if (
        silhouette?.getBoundingClientRect() &&
        canvasRef?.current?.getBoundingClientRect()
      ) {
        const {
          height: sHeight,
          width: sWidth,
          x: sX,
          y: sY,
        } = silhouette.getBoundingClientRect();
        const canvasBoundary = canvasRef?.current?.getBoundingClientRect();
        if (
          x * reductionFactor > sX - canvasBoundary.left &&
          (x + width) * reductionFactor < sX + sWidth - canvasBoundary.left
        ) {
          if (
            y * reductionFactor > sY - canvasBoundary.top &&
            (y + height) * reductionFactor < sY + sHeight - canvasBoundary.top
          )
            setIsHumanInsideSilhouette(true);
          else setIsHumanInsideSilhouette(false);
        } else setIsHumanInsideSilhouette(false);
      } else {
        setIsHumanInsideSilhouette(false);
      }
    } else {
      setIsHumanInsideSilhouette(false);
    }
  }, [canvasRef, humanFace]);

  const detectMyFace = () => {
    setInterval(async () => {
      if (videoRef.current && canvasRef.current && faceapi) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          );

          if (!loading && canvasRef.current)
            canvasRef.current.append(
              faceapi.createCanvasFromMedia(videoRef.current)
            );

          faceapi.matchDimensions(canvasRef.current, {
            width: deviceCameraDimensions.width,
            height: deviceCameraDimensions.height,
          });

          const resized = faceapi.resizeResults(detections, {
            width: deviceCameraDimensions.width,
            height: deviceCameraDimensions.height,
          });

          setHumanFace(resized);

          faceapi.draw.drawDetections(canvasRef.current, resized);
        } catch (e) {
          console.log("Error: ", e);
        }
      }
    }, 1000);
  };

  const loadModels = () => {
    Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri("/models")])
      .then(() => {
        setLoading(false);
        detectMyFace();
      })
      .catch((e) => console.log("Rejected: ", e));
  };

  const startVideo = () => {
    if (!navigator.mediaDevices) {
      const show = () =>
        console.log(
          "Please make sure you are using secure connection for the camera to work."
        );
      const multipleHumanError = throttle(() => show(), 5000);
      multipleHumanError();
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((currentStream) => {
        if (videoRef.current) videoRef.current.srcObject = currentStream;
        const { width, height } = currentStream.getTracks()[0].getSettings();
        if (width && height) setDeviceCameraDimensions({ width, height });
      })
      .then(() => loadModels())
      .catch((e) => {
        console.log("Error: ", e);
      });
  };

  useEffect(() => {
    if (opened) {
      startVideo();
    } else {
      let videoElement;

      if (videoRef.current) {
        videoElement = videoRef.current;
        if (videoElement && videoElement.srcObject) {
          videoElement.srcObject.getTracks().forEach((track) => {
            console.log("closing video player");
            if (track.readyState === "live") {
              track.stop();
            }
          });
        }
      }
    }
  }, [opened, videoRef]);

  const captureImage = () => {
    const finalImageCanvas = document.getElementById("final-image-canvas");
    const video = document.getElementById("video");
    finalImageCanvas.width = video.videoWidth;
    finalImageCanvas.height = video.videoHeight;
    finalImageCanvas
      ?.getContext("2d")
      ?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    const dataURI = finalImageCanvas.toDataURL("image/jpeg");
    const data = dataURI.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(data, "base64");
    const newFile = new File([buf], "capture.jpeg", {
      type: "image/jpeg",
      lastModified: new Date().getTime(),
    });
    setHumanCaptured(true);
    form.setValue(name, newFile);
  };

  const handleRetake = () => {
    const finalImageCanvas = document.getElementById("final-image-canvas");
    const context = finalImageCanvas.getContext("2d");
    context?.clearRect(0, 0, finalImageCanvas.width, finalImageCanvas.height);
    setIsHumanInsideSilhouette(false);
    setHumanFace(undefined);
    setHumanCaptured(false);
  };

  return (
    <div>
      <Modal
        fullScreen
        isOpen={opened}
        onRequestClose={close}
        contentLabel="User profile picture"
      >
        <div className="camera-wrapper">
          <img
            id="silhouette"
            className={classNames({ grayscale: !isHumanInsideSilhouette })}
            src="/images/oval.svg"
            alt="oval"
          />
          {loading ? <div>Loading...</div> : null}
          <div className="action-btn-container">
            {!humanCaptured ? (
              <button
                className={classNames("action-button", {
                  "bg-white": isHumanInsideSilhouette,
                })}
                type="button"
                disabled={!isHumanInsideSilhouette || humanCaptured}
                onClick={captureImage}
              >
                <FontAwesomeIcon icon={faCamera} color="#202020" />
              </button>
            ) : (
              <>
                <button
                  className="bg-white action-button"
                  type="button"
                  onClick={handleRetake}
                >
                  <FontAwesomeIcon icon={faRefresh} color="#202020" />
                </button>
                <button
                  className="bg-white action-button"
                  type="button"
                  onClick={close}
                >
                  <FontAwesomeIcon icon={faCheck} color="#202020" />
                </button>
              </>
            )}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            id="video"
            className="relative w-full"
            crossOrigin="anonymous"
            ref={videoRef}
            autoPlay
            muted
          />
          <canvas id="final-image-canvas" className="absolute w-full z-[100]" />
        </div>
        <canvas
          id="face-api-canvas"
          ref={canvasRef}
          className="absolute top-0 w-100% max-w-[100vw] left-1/2 -translate-x-1/2"
        />
      </Modal>
      <div className="profile-frame">
        {file ? (
          <img
            src={URL.createObjectURL(file)}
            width={200}
            height={200}
            className="profile-image"
            alt="file"
          />
        ) : (
          <FontAwesomeIcon icon={faUser} size="4x" color="#ACA" />
        )}
      </div>
    </div>
  );
};

export default CameraInput;
