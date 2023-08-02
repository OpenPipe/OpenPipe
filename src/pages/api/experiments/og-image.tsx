import { ImageResponse } from "@vercel/og";
import { type NextApiRequest, type NextApiResponse } from "next";

export const config = {
  runtime: "experimental-edge",
};

const inconsolataRegularFontP = fetch(
  new URL("../../../../public/fonts/Inconsolata_SemiExpanded-Medium.ttf", import.meta.url),
).then((res) => res.arrayBuffer());

const OgImage = async (req: NextApiRequest, _res: NextApiResponse) => {
  // @ts-expect-error - nextUrl is not defined on NextApiRequest for some reason
  const searchParams = req.nextUrl?.searchParams as URLSearchParams;
  const experimentLabel = searchParams.get("experimentLabel");
  const variantsCount = searchParams.get("variantsCount");
  const scenariosCount = searchParams.get("scenariosCount");

  const inconsolataRegularFont = await inconsolataRegularFontP;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          padding: "48px",
          background: "white",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            padding: 48,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://app.openpipe.ai/logo.svg"
            alt="OpenPipe Logo"
            height={100}
            width={120}
          />
          <div style={{ marginLeft: 24, fontSize: 64, fontFamily: "Inconsolata" }}>OpenPipe</div>
        </div>

        <div style={{ display: "flex", fontSize: 72, marginTop: 108 }}>{experimentLabel}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          <div style={{ display: "flex" }}>
            <span style={{ width: 320 }}>Variants:</span> {variantsCount}
          </div>
          <div style={{ display: "flex", marginTop: 24 }}>
            <span style={{ width: 320 }}>Scenarios:</span> {scenariosCount}
          </div>
        </div>
      </div>
    ),
    {
      fonts: [
        {
          name: "inconsolata",
          data: inconsolataRegularFont,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
};

export default OgImage;
