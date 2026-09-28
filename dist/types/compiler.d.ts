import { Scope } from './scope.js';
import './core-directives.js';
/**
 * Compile a DOM element and its children
 *
 * @param {Node} el - DOM element to compile
 * @param {Object} scope - Reactive data scope
 * @param {Scope} cs - Current scope for cleanup tracking
 */
export declare const compile: (el: Node, scope: Object, cs: Scope) => void;
