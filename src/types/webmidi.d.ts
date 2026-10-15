// Minimal Web MIDI types (not yet in lib.dom).
interface MIDIMessageEvent extends Event {
  data: Uint8Array | null;
}
interface MIDIInput {
  onmidimessage: ((e: MIDIMessageEvent) => void) | null;
}
interface MIDIAccess {
  inputs: Map<string, MIDIInput>;
  onstatechange: (() => void) | null;
}
interface Navigator {
  requestMIDIAccess?: () => Promise<MIDIAccess>;
}
