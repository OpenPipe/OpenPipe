import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { identifySession } from "~/utils/analytics";

const SessionIdentifier = () => {
  const session = useSession().data;
  useEffect(() => {
    if (session) identifySession(session);
  }, [session]);
  return null;
};

export default SessionIdentifier;