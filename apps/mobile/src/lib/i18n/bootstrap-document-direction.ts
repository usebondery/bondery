import { detachPromise } from "@bondery/helpers/async";
import { bootstrapDocumentDirectionFromStorage } from "./documentDirection";

detachPromise(bootstrapDocumentDirectionFromStorage());
