
import React from 'react';

export const BODY_SHAPES = [
  'Hourglass', 'Pear', 'Apple', 'Rectangle', 'Inverted Triangle', 'Athletic', 'Petite', 'Plus Size'
];

export const STYLE_VIBES = [
  'Minimalist', 'Boho', 'Corporate Chic', 'Ethnic Fusion', 'Streetwear', 'Party/Glam', 'Casual'
];

export const OCCUPATIONS = [
  'Student', 'Working Professional', 'Creative / Artist', 'Teacher / Academic', 'Influencer / Content Creator', 'Entrepreneur', 'Homemaker'
];

export const DAILY_OCCASIONS = [
  'College / Class', 'Work / Office', 'Casual Outing', 'Coffee Date', 'Dinner Date', 'Party / Clubbing', 'Gym / Workout', 'Travel / Flight', 'Stay at Home'
];

export const DUMMY_WARDROBE_ITEMS = [
  { id: '1', name: 'Classic Blue Jeans', type: 'bottom', image: 'https://picsum.photos/200/300?random=1' },
  { id: '2', name: 'White Linen Shirt', type: 'top', image: 'https://picsum.photos/200/300?random=2' },
  { id: '3', name: 'Black Kurti', type: 'ethnic', image: 'https://picsum.photos/200/300?random=3' },
];

export const AD_UNITS = {
    APP_ID: 'ca-app-pub-5853561244187558~5606812792',
    REWARDED_VIDEO: 'ca-app-pub-5853561244187558/8613902471',
    BANNER_HOME: 'ca-app-pub-5853561244187558/7511631844',
    INTERSTITIAL: 'ca-app-pub-5853561244187558/5987739139',
    REWARDED_INTERSTITIAL: 'ca-app-pub-5853561244187558/3819798844'
};

const commonProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icons = {
  Camera: () => (
    React.createElement("svg", { ...commonProps },
      React.createElement("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }),
      React.createElement("circle", { cx: "12", cy: "13", r: "3" })
    )
  ),
  Upload: () => (
    React.createElement("svg", { ...commonProps },
      React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      React.createElement("polyline", { points: "17 8 12 3 7 8" }),
      React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
    )
  ),
  Sparkles: () => (
    React.createElement("svg", { ...commonProps },
      React.createElement("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" })
    )
  ),
  Home: () => (
    React.createElement("svg", { ...commonProps },
      React.createElement("path", { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
      React.createElement("polyline", { points: "9 22 9 12 15 12 15 22" })
    )
  ),
  Shirt: () => (
    React.createElement("svg", { ...commonProps },
      React.createElement("path", { d: "M20.38 3.4a2 2 0 0 0-1.2-1.1l-2.19-.55a.5.5 0 0 0-.38.27L15 4H9l-1.6-2a.5.5 0 0 0-.38-.27L4.82 2.3a2 2 0 0 0-1.2 1.1l-2 6a2 2 0 0 0 1.2 2.5l1.18.3v9.7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.7l1.18-.3a2 2 0 0 0 1.2-2.5l-2-6Z" })
    )
  ),
  Share: () => (
     React.createElement("svg", { ...commonProps },
        React.createElement("circle", { cx: "18", cy: "5", r: "3" }),
        React.createElement("circle", { cx: "6", cy: "12", r: "3" }),
        React.createElement("circle", { cx: "18", cy: "19", r: "3" }),
        React.createElement("line", { x1: "8.59", y1: "13.51", x2: "15.42", y2: "17.49" }),
        React.createElement("line", { x1: "15.41", y1: "6.51", x2: "8.59", y2: "10.49" })
     )
  ),
  Zap: () => (
     React.createElement("svg", { ...commonProps },
        React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
     )
  ),
  Heart: () => (
     React.createElement("svg", { ...commonProps },
        React.createElement("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" })
     )
  ),
  HeartFilled: () => (
     React.createElement("svg", { ...commonProps, fill: "currentColor" },
        React.createElement("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" })
     )
  ),
  Trash: () => (
     React.createElement("svg", { ...commonProps },
        React.createElement("polyline", { points: "3 6 5 6 21 6" }),
        React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
        React.createElement("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
        React.createElement("line", { x1: "14", y1: "11", x2: "14", y2: "17" })
     )
  ),
  ArrowLeft: () => (
    React.createElement("svg", { ...commonProps },
       React.createElement("line", { x1: "19", y1: "12", x2: "5", y2: "12" }),
       React.createElement("polyline", { points: "12 19 5 12 12 5" })
    )
 ),
 Video: () => (
    React.createElement("svg", { ...commonProps },
       React.createElement("polygon", { points: "23 7 16 12 23 17 23 7" }),
       React.createElement("rect", { x: "1", y: "5", width: "15", height: "14", rx: "2", ry: "2" })
    )
 )
};
