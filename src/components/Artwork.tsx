import { useId } from 'react';
import { TABLE_ORDER, type Progress } from '../core/model';
export function Firefly({
  className = '',
  happy = false,
}: {
  className?: string;
  happy?: boolean;
}) {
  return (
    <svg className={className} viewBox="0 0 180 180" aria-hidden="true">
      <ellipse cx="90" cy="162" rx="38" ry="8" fill="#163d38" opacity=".1" />
      <path
        d="M75 80C8 8 8 120 72 120M105 80c67-72 67 40 3 40"
        fill="#b7ded5"
        stroke="#28625b"
        strokeWidth="3"
      />
      <path d="M79 58 66 35m37 23 13-23" stroke="#163d38" strokeWidth="4" strokeLinecap="round" />
      <circle cx="65" cy="33" r="6" fill="#e6a84e" />
      <circle cx="117" cy="33" r="6" fill="#e6a84e" />
      <ellipse cx="90" cy="108" rx="33" ry="45" fill="#f4c864" />
      <path d="M63 111q27 12 54 0" stroke="#dfaa44" strokeWidth="4" />
      <circle cx="90" cy="77" r="29" fill="#18463e" />
      <ellipse cx="80" cy="75" rx="4" ry="6" fill="#fffaf0" />
      <ellipse cx="100" cy="75" rx="4" ry="6" fill="#fffaf0" />
      <path
        d={happy ? 'M78 87q12 15 24 0' : 'M83 88q7 7 14 0'}
        fill="none"
        stroke="#fffaf0"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="68" cy="85" r="5" fill="#eb9d7b" />
      <circle cx="112" cy="85" r="5" fill="#eb9d7b" />
    </svg>
  );
}
export function IslandArt({
  restored = 0,
  decorations = {},
}: {
  restored?: number;
  decorations?: Progress['decorations'];
}) {
  const id = useId();
  return (
    <svg className="island-art" viewBox="0 0 800 570" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}land`} x2="0" y2="1">
          <stop stopColor="#b1cd91" />
          <stop offset="1" stopColor="#7cab7d" />
        </linearGradient>
        <linearGradient id={`${id}water`} x2="0" y2="1">
          <stop stopColor="#bedfd9" />
          <stop offset="1" stopColor="#8dc7c2" />
        </linearGradient>
      </defs>
      <ellipse cx="408" cy="420" rx="322" ry="112" fill="#dcece4" />
      <path d="M76 352Q41 438 218 483q149 74 338-3 207-34 173-130Z" fill="#639a94" />
      <path
        d="M102 321Q42 385 166 433q166 104 368 23 230-32 182-135L531 169 258 180Z"
        fill={`url(#${id}water)`}
      />
      <path
        d="M159 276q-60 36-24 91 19 42 92 34 5 67 124 42 64 37 128-12 107 28 124-39 104-6 62-81-17-24-62-20L519 185l-233-14Z"
        fill="#6a9870"
      />
      <path
        d="M160 256q-61 37-23 87 17 43 90 35 5 66 124 42 64 37 128-12 107 28 124-39 104-6 62-80-17-24-62-20L519 163l-233-14Z"
        fill={`url(#${id}land)`}
      />
      <path
        d="M233 349q75 18 117-27t81-21q60 35 122 48"
        fill="none"
        stroke="#e6d8ac"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <path d="m302 211 102-152 116 164Z" fill="#91aaa0" />
      <path d="m356 132 48-73 55 82-41-16-19 17-20-25Z" fill="#f4f2df" />
      <path d="m433 229 77-111 83 117Z" fill="#a5b9a2" />
      <path d="M416 218q-44 59-9 101t-29 73" fill="none" stroke="#8ccccc" strokeWidth="28" />
      <path d="M416 225q-33 58-9 94" fill="none" stroke="#d8eee1" strokeWidth="5" />
      {[
        [209, 242, 1],
        [261, 211, 0.8],
        [572, 258, 1],
        [602, 310, 0.7],
        [175, 299, 0.65],
        [504, 265, 0.75],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M0 0v65" stroke="#7b6c4c" strokeWidth="9" />
          <path d="m0-69-38 69h19l-26 35H45L20 0h19Z" fill={i % 2 ? '#386d54' : '#245b49'} />
          <path d="m0-54-23 48H0Z" fill="#477d58" />
        </g>
      ))}
      <g transform="translate(292 317)">
        <path d="M-27 0v38h56V0" fill="#fff1c9" />
        <path d="m-40 0 40-38L40 0Z" fill="#c07653" />
        <path d="M-5 38V14h17v24" fill="#684e3d" />
        <rect x="-21" y="9" width="10" height="11" rx="3" fill="#edb352" />
      </g>
      <g transform="translate(516 337)">
        <ellipse cy="22" rx="43" ry="18" fill="#82a470" />
        <path d="M-16 17V-8h11v25m18 0v-35h12v35" stroke="#f1e1bf" strokeWidth="9" />
        <path d="M-43-7q21-44 50 0Zm35-14q28-50 57 0Z" fill="#cc8263" />
        <circle cx="-22" cy="-16" r="4" fill="#fff3d7" />
        <circle cx="24" cy="-34" r="5" fill="#fff3d7" />
      </g>
      <g transform="translate(362 389)">
        <path d="m-44 0 80-23 5 14-80 24Z" fill="#af855d" />
        <path d="m-32-3 3 12m14-17 3 12m14-16 3 12m13-17 3 12" stroke="#ddbd87" strokeWidth="3" />
      </g>
      {[
        [249, 382],
        [458, 372],
        [549, 296],
        [339, 276],
        [192, 337],
        [591, 367],
        [355, 181],
        [486, 228],
        [398, 417],
        [312, 229],
      ]
        .slice(0, Math.max(3, restored))
        .map(([x, y], i) => (
          <g key={i} className="spark" style={{ animationDelay: `${i * 0.4}s` }}>
            <circle cx={x} cy={y} r="13" fill="#fff3a0" opacity=".24" />
            <circle cx={x} cy={y} r="4" fill="#fff5b8" />
          </g>
        ))}
      {[
        [255, 360],
        [229, 267],
        [604, 353],
        [475, 397],
        [431, 279],
        [173, 338],
        [503, 241],
        [542, 299],
        [337, 407],
        [370, 191],
      ].map(([x, y], i) => {
        const decoration = decorations[TABLE_ORDER[i]];
        return decoration ? (
          <g key={i} transform={`translate(${x} ${y})`}>
            <DecorationArt kind={decoration} />
          </g>
        ) : null;
      })}
      <path
        d="m121 418 22 4m471 45 25-9M184 463l24 5m407-59 27-8"
        stroke="#e2f3e8"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Creature({ index, className = '' }: { index: number; className?: string }) {
  if (index === 0) return <Firefly className={className} happy />;
  const colors = ['#edbf65', '#a9c9b1', '#deaf97', '#bbafd5', '#a3c3d7'];
  return (
    <svg className={className} viewBox="0 0 130 120" aria-hidden="true">
      <ellipse cx="65" cy="109" rx="40" ry="7" fill="#183d38" opacity=".1" />
      <path
        d={
          index % 2
            ? 'M33 53 24 12q28 0 29 29m24 0q4-27 29-29L98 57'
            : 'M35 50Q10 4 54 32m22 0q44-28 20 19'
        }
        fill={colors[index % 5]}
        stroke="#365a4b"
        strokeWidth="3"
      />
      <ellipse cx="65" cy="70" rx="43" ry="39" fill={colors[index % 5]} />
      <ellipse cx="65" cy="83" rx="25" ry="22" fill="#ffedc6" />
      <circle cx="49" cy="63" r="5" fill="#21463d" />
      <circle cx="81" cy="63" r="5" fill="#21463d" />
      <circle cx="50" cy="61" r="1.5" fill="white" />
      <circle cx="82" cy="61" r="1.5" fill="white" />
      <path
        d="m60 75 5 4 5-4m-5 4v5"
        fill="none"
        stroke="#21463d"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M31 99h17m34 0h17" stroke="#365a4b" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function DecorationArt({ kind }: { kind: 'flowers' | 'mushrooms' | 'crystals' }) {
  if (kind === 'crystals')
    return (
      <g>
        <path
          d="m-12 12-8-22 8-14 9 14 12-12 10 18-8 16Z"
          fill="#a693cd"
          stroke="#715c9d"
          strokeWidth="2"
        />
        <path d="m-12-24 1 33M9-22 3 9" stroke="#e3d7f8" strokeWidth="3" />
      </g>
    );
  if (kind === 'mushrooms')
    return (
      <g>
        <path d="M-10 12V-4M11 12v-24" stroke="#fff2cf" strokeWidth="8" />
        <path d="M-28-4q18-30 35 0ZM-8-12q19-36 40 0Z" fill="#be6e52" />
        <circle cx="13" cy="-23" r="4" fill="#fff6db" />
        <circle cx="-13" cy="-12" r="3" fill="#fff6db" />
      </g>
    );
  return (
    <g>
      {[-16, 0, 16].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 ? -12 : 0})`}>
          <path d="M0 10v-22" stroke="#447547" strokeWidth="3" />
          <path d="M0-9c-24 0-12-20 0-10 12-10 24 10 0 10Z" fill="#eaa18b" />
          <circle cy="-13" r="4" fill="#ffe69b" />
        </g>
      ))}
    </g>
  );
}
