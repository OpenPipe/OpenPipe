import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

import openApiDocument from "~/../public/openapi.json";

export default function Swagger() {
  return <SwaggerUI spec={openApiDocument} />;
}
