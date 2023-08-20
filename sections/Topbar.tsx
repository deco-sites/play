import type { ComponentChildren } from "preact";

export interface Props {
  browse?: string;
  /** @description multiple colors will create a gradient effect */
  backgroundColors?: string[];
  inlineStyle?: string;
}

const defaultProps = (props: Props) => ({
  browse: props.browse ?? "https://fashion.deco.site",
  backgroundColors: props.backgroundColors ?? ["#000000", "#0A2121"],
  inlineStyle: props.inlineStyle ?? "",
});

function Topbar(props: Props) {
  const { browse, backgroundColors, inlineStyle } = defaultProps(props);

  return (
    <BaseContainer
      backgroundColors={backgroundColors}
      inlineStyle={inlineStyle}
    >
      <header class="flex items-center gap-4 w-100">
        <div class="rounded-full p-4">
          deco.cx
        </div>

        <input class="text-black" value={browse}></input>

        <div class="tabs tabs-boxed">
          <a class="tab">Blocks</a>
          <a class="tab tab-active">Site</a>
        </div>
      </header>
    </BaseContainer>
  );
}

function generateColorClasses(
  colors?: string[],
  gradientDirection = "r",
  prefix = "",
) {
  if (!colors || colors.length === 0) return "";
  if (colors.length === 1) return `${prefix}bg-[${colors[0]}]`;

  const from = `from-[${colors[0]}]`;
  const to = `to-[${colors[1]}]`;
  return `${prefix}bg-gradient-to-${gradientDirection} ${prefix}${from} ${prefix}${to}`;
}

function BaseContainer(props: {
  children?: ComponentChildren;
  backgroundColors?: string[];
  inlineStyle: string;
}) {
  const { backgroundColors, inlineStyle } = props ?? {};
  const baseClasses = "flex justify-center w-full";
  const colorClasses = generateColorClasses(backgroundColors, "t");
  const containerClasses = `${baseClasses} ${colorClasses}`;

  return (
    <div class={containerClasses} style={inlineStyle}>
      <div class="flex items-center gap-12 p-2 w-full text-white">
        {props.children}
      </div>
    </div>
  );
}

export default Topbar;
