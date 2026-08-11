import { Reflect } from "./reflect/reflect.js";
export declare class WgslReflect extends Reflect {
    constructor(code?: string);
    update(code: string): void;
}
