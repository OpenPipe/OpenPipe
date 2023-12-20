import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

import openApiDocument from "~/../openapi.json";

export default function Swagger() {
  return <SwaggerUI spec={openApiDocument} />;
}
