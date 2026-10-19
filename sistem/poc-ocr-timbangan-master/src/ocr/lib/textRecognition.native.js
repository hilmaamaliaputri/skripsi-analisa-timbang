// Native (iOS/Android): pakai @react-native-ml-kit/text-recognition.
import TextRecognition from "@react-native-ml-kit/text-recognition";

export default {
  recognize: (uri) => TextRecognition.recognize(uri),
};
