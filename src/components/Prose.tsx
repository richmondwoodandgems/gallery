import { Fragment } from 'react';

/**
 * Renders owner-typed text line-for-line: single newlines become line breaks,
 * blank lines start a new paragraph. Real <p> elements mean paragraph spacing
 * is set in CSS rather than showing as a raw empty line.
 */
export default function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>
          {paragraph.split('\n').map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}
