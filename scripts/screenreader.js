// ======= DOM References & Globals =======
const paragraphs = document.querySelectorAll('p');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontWeightSlider = document.getElementById('fontWeightSlider');
const lineHeightSlider = document.getElementById('lineHeightSlider');
const letterSpacingSlider = document.getElementById('letterSpacingSlider');
const speedSlider = document.getElementById('speedSlider');
const volumeSlider = document.getElementById('volumeSlider');
const sliders = document.querySelectorAll('input[type="range"]');
const nav = document.getElementById('accessibilityNav');
const allFocusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');

const synth = window.speechSynthesis;

let trapFocus = false;
let currentFocusedParagraph = null;
let isPaused = false;
let currentSentenceIndex = 0;
let highlightSentenceCount = 1;
let noteFocusMode = false;

// ======= Helper Functions =======
function readText(text, callback = null) {
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(speedSlider.value);
    utterance.volume = parseFloat(volumeSlider.value);
    if (callback) utterance.onend = callback;
    synth.speak(utterance);
}

function splitIntoSentences(text) {
    return text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
}

function setFocusableInNav(onlyInNav) {
    allFocusable.forEach(el => {
        const insideNav = nav.contains(el);
        el.setAttribute('tabindex', onlyInNav ? (insideNav ? '0' : '-1') : (insideNav ? '-1' : '0'));
    });
    paragraphs.forEach(p => {
        p.setAttribute('tabindex', onlyInNav ? '-1' : '0');
    });
}

function enableNoteTabbing() {
    const allNotes = document.querySelectorAll('.note, .note-textarea');
    allFocusable.forEach(el => el.setAttribute('tabindex', '-1'));
    paragraphs.forEach(p => p.setAttribute('tabindex', '-1'));
    allNotes.forEach(note => note.setAttribute('tabindex', '0'));
    if (allNotes.length > 0) allNotes[0].focus();
}

function disableNoteTabbing() {
    allFocusable.forEach(el => el.setAttribute('tabindex', '0'));
    paragraphs.forEach(p => p.setAttribute('tabindex', '0'));
    const allNotes = document.querySelectorAll('.note, .note-textarea');
    allNotes.forEach(note => note.removeAttribute('tabindex'));
}

// ======= Paragraph Reading & Notes =======
paragraphs.forEach(p => {
    const originalText = p.textContent;
    const sentences = splitIntoSentences(originalText);
    p.setAttribute('tabindex', '0');

    p.notes = {};

    p.addEventListener('focus', () => {
        paragraphs.forEach(otherP => {
            if (otherP !== p) {
                const spans = otherP.querySelectorAll('.highlight');
                spans.forEach(span => span.classList.remove('highlight'));
            }
        });

        currentFocusedParagraph = p;
        currentSentenceIndex = 0;
        isPaused = false;
        renderAndRead();
    });

    p.addEventListener('blur', () => {
        synth.cancel();
    });

    p.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'TEXTAREA') return;

        if (e.key === ' ') {
            e.preventDefault();
            if (synth.speaking) {
                synth.cancel();
                isPaused = true;
            } else {
                isPaused = false;
                renderAndRead();
            }
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentSentenceIndex > 0) {
                currentSentenceIndex -= highlightSentenceCount;
                renderAndRead();
            }
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentSentenceIndex < sentences.length - 1) {
                currentSentenceIndex += highlightSentenceCount;
                renderAndRead();
            }
        }

        if (e.key.toLowerCase() === 'j') {
            e.preventDefault();
            const span = p.querySelector('.highlight');
            if (!span || span.nextElementSibling?.classList.contains('note-textarea')) return;

            const sentenceIndex = parseInt(span.getAttribute('data-sentence-index'), 10);

            const textarea = document.createElement('textarea');
            textarea.className = 'note-textarea';
            textarea.placeholder = 'Write your note and press Enter';
            textarea.style.width = '100%';
            textarea.style.fontSize = '1rem';
            textarea.style.marginTop = '0.5rem';

            span.insertAdjacentElement('afterend', textarea);
            textarea.focus();

            textarea.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const noteText = textarea.value.trim();
                    if (noteText) {
                        p.notes[sentenceIndex] = noteText;
                        renderParagraph();
                    }
                }
            });
        }
    });

    function renderParagraph() {
        p.innerHTML = '';

        sentences.forEach((sentence, index) => {
            const isHighlighted = index >= currentSentenceIndex && index < currentSentenceIndex + highlightSentenceCount;

            const sentenceSpan = document.createElement('span');
            sentenceSpan.textContent = sentence;
            sentenceSpan.setAttribute('data-sentence-index', index);
            if (isHighlighted) {
                sentenceSpan.classList.add('highlight');
            }

            p.appendChild(sentenceSpan);

            if (p.notes[index]) {
                const noteSpan = document.createElement('span');
                noteSpan.className = 'note';
                noteSpan.textContent = p.notes[index];
                noteSpan.setAttribute('data-sentence-index', index);
                noteSpan.style.marginLeft = '0.5rem';
                noteSpan.style.fontSize = '1.1rem';
                noteSpan.style.fontWeight = 'bold';
                noteSpan.style.cursor = 'pointer';
                if (noteFocusMode) noteSpan.setAttribute('tabindex', '0');

                noteSpan.addEventListener('click', () => {
                    const textarea = document.createElement('textarea');
                    textarea.className = 'note-textarea';
                    textarea.value = p.notes[index];
                    textarea.style.width = '100%';
                    textarea.style.fontSize = '1rem';
                    textarea.style.marginTop = '0.5rem';

                    noteSpan.replaceWith(textarea);
                    textarea.focus();

                    textarea.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            const noteText = textarea.value.trim();
                            if (noteText) {
                                p.notes[index] = noteText;
                            } else {
                                delete p.notes[index];
                            }
                            renderParagraph();
                        }
                    });
                });

                p.appendChild(noteSpan);
            }

            p.appendChild(document.createTextNode(' '));
        });
    }

    function renderAndRead() {
        renderParagraph();
        const toRead = sentences.slice(currentSentenceIndex, currentSentenceIndex + highlightSentenceCount).join(' ');
        readText(toRead, () => {
            currentSentenceIndex += highlightSentenceCount;
            if (currentSentenceIndex < sentences.length) {
                renderAndRead();
            }
        });
    }
});

// ======= Sliders Read Label on Focus =======
sliders.forEach(slider => {
    slider.addEventListener('focus', () => {
        const label = document.querySelector(`label[for="${slider.id}"]`);
        if (label) readText(label.textContent);
    });
});

// ======= Accessibility Navigation Toggle & Note Focus Mode =======
document.addEventListener('keydown', (e) => {
    const isTyping = document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT';

    if (e.key.toLowerCase() === 'k' && !e.repeat && !isTyping) {
        e.preventDefault();
        noteFocusMode = !noteFocusMode;

        if (noteFocusMode) {
            readText("Note focus mode on. Tab will now move through notes only.");
            enableNoteTabbing();
        } else {
            readText("Note focus mode off. Restoring normal tab behavior.");
            disableNoteTabbing();
        }
    }

    if (e.key.toLowerCase() === 'f' && !isTyping) {
        e.preventDefault();
        trapFocus = !trapFocus;
        synth.cancel();

        if (trapFocus) {
            nav.style.right = '0';
            setFocusableInNav(true);
            const focusable = nav.querySelectorAll('input, button, a, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length > 0) focusable[0].focus();
        } else {
            nav.style.right = '-60vw';
            setFocusableInNav(false);
            document.activeElement.blur();
        }
    }



    const key = parseInt(e.key, 10);
    if (!isNaN(key) && key >= 1 && key <= 9 && !isTyping) {
        highlightSentenceCount = key;
        readText(`Highlighting ${highlightSentenceCount} sentence${highlightSentenceCount > 1 ? 's' : ''}.`);
    }
});

// ======= Word Export (Note on New Line & Bigger Font) =======
document.addEventListener('keydown', async (e) => {
    const isTyping = document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT';
    if (e.key.toLowerCase() === 'w' && !isTyping) {
        e.preventDefault();

        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

        const docParagraphs = [];

        paragraphs.forEach((p, pIndex) => {
            docParagraphs.push(new Paragraph({
                text: `Paragraph ${pIndex + 1}`,
                heading: HeadingLevel.HEADING_2
            }));

            const sentences = splitIntoSentences(p.textContent);

            sentences.forEach((sentence, idx) => {
                const cleanText = sentence.trim().replace(/\s+/g, ' ');

                // Add sentence
                docParagraphs.push(new Paragraph({
                    children: [new TextRun({ text: cleanText, size: 22 })]
                }));

                // Add note on a new line if available
                if (p.notes && p.notes[idx]) {
                    docParagraphs.push(new Paragraph({
                        children: [new TextRun({
                            text: `Note: ${p.notes[idx]}`,
                            bold: true,
                            italics: true,
                            size: 26,
                        })]
                    }));
                }
            });
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: docParagraphs
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'notes.docx';
        a.click();

        readText("Notes and text downloaded as Word document.");
    }
});



// ======= Style Sliders Live =======
fontSizeSlider.addEventListener('input', () => {
    const value = `${fontSizeSlider.value}px`;
    paragraphs.forEach(p => p.style.fontSize = value);
    document.getElementById('fontSizeValue').textContent = `Current: ${value}`;
});

fontWeightSlider.addEventListener('input', () => {
    const value = fontWeightSlider.value;
    paragraphs.forEach(p => p.style.fontWeight = value);
    document.getElementById('fontWeightValue').textContent = `Current: ${value}`;
});

lineHeightSlider.addEventListener('input', () => {
    const value = lineHeightSlider.value;
    paragraphs.forEach(p => p.style.lineHeight = value);
    document.getElementById('lineHeightValue').textContent = `Current: ${value}`;
});

letterSpacingSlider.addEventListener('input', () => {
    const value = `${letterSpacingSlider.value}px`;
    paragraphs.forEach(p => p.style.letterSpacing = value);
    document.getElementById('letterSpacingValue').textContent = `Current: ${value}`;
});

speedSlider.addEventListener('input', () => {
    document.getElementById('speedValue').textContent = `Current: ${speedSlider.value}x`;
    readText("Screen reader speed updated.");
});

volumeSlider.addEventListener('input', () => {
    document.getElementById('volumeValue').textContent = `Current: ${volumeSlider.value}`;
    readText("Screen reader volume updated.");
});

// ======= Set Sentence Highlight Count with 1–9 Keys =======
document.addEventListener('keydown', (e) => {
    const key = parseInt(e.key, 10);
    const isTyping = document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT';
    if (!isNaN(key) && key >= 1 && key <= 9 && !isTyping) {
        highlightSentenceCount = key;
        readText(`Highlighting ${highlightSentenceCount} sentence${highlightSentenceCount > 1 ? 's' : ''}.`);
    }
});

// ======= Init on Load =======
setFocusableInNav(false);
if (paragraphs.length > 0) paragraphs[0].focus();
