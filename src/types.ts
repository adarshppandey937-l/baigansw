export interface BatchItem {
  id: string;
  _id?: string;
  title?: string;
  name?: string;
  banner?: string;
  thumbnail?: string;
  price?: number;
  discountPrice?: number;
  originalPrice?: number;
  isLive?: boolean;
  validity?: string;
  description?: string | string[];
  about?: string;
  summary?: string;
  courseHighlights?: Array<string | { title?: string; text?: string }> | string;
  highlights?: Array<string | { title?: string; text?: string }> | string;
  facultyDetails?: Array<{
    name?: string;
    title?: string;
    teacherName?: string;
    image?: string;
    photo?: string;
    avatar?: string;
    bio?: string;
    description?: string;
  }>;
  faculty?: any;
  faqs?: Array<{ question?: string; q?: string; answer?: string; a?: string }>;
  faq?: Array<{ question?: string; q?: string; answer?: string; a?: string }>;
  timeTable?: any;
  timetable?: any;
  schedule?: any;
}

export interface ClassItem {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  topicName?: string;
  chapterName?: string;
  chapter?: string;
  subTopic?: string;
  subTopicName?: string;
  class_link?: string;
  video_link?: string;
  link?: string;
  url?: string;
  streamUrl?: string;
  thumbnail?: string;
  banner?: string;
  image?: string;
  startDate?: string;
  createdAt?: string;
  date?: string;
  duration?: number | string;
  length?: number | string;
  videoDuration?: number | string;
  video_duration?: number | string;
  runtime?: number | string;
  classPdf?: Array<string | { url: string; title?: string }>;
  pdfs?: Array<string | { url: string; title?: string }>;
  mp4Recordings?: Array<{ quality?: string; url: string }>;
  isLive?: boolean;
  streamStatus?: string;
}

export interface TopicFolder {
  topicName?: string;
  title?: string;
  name?: string;
  classes?: ClassItem[];
  videos?: ClassItem[];
  items?: ClassItem[];
  chapters?: Array<{
    chapterName?: string;
    title?: string;
    name?: string;
    classes?: ClassItem[];
    videos?: ClassItem[];
  }>;
}

export interface WatchHistoryEntry {
  url: string;
  title: string;
  time: string;
  batchId?: string;
}
