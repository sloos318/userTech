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

// ======= Paragraph Reading & Notes =======
paragraphs.forEach(p => {
    const originalText = p.textContent;
    const sentences = splitIntoSentences(originalText);
    p.setAttribute('tabindex', '0');

    // Per-paragraph note storage
    p.notes = {};

    p.addEventListener('focus', () => {
        // Clear highlights in other paragraphs
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
        // ✅ Ignore all key logic while typing in a note
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
        p.innerHTML = ''; // Clear existing content
    
        sentences.forEach((sentence, index) => {
            const isHighlighted = index >= currentSentenceIndex && index < currentSentenceIndex + highlightSentenceCount;
    
            // Create sentence span
            const sentenceSpan = document.createElement('span');
            sentenceSpan.textContent = sentence;
            sentenceSpan.setAttribute('data-sentence-index', index);
            if (isHighlighted) {
                sentenceSpan.classList.add('highlight');
            }
    
            p.appendChild(sentenceSpan);
    
            // If a note exists for this sentence, create note span
            if (p.notes[index]) {
                const noteSpan = document.createElement('span');
                noteSpan.className = 'note';
                noteSpan.textContent = p.notes[index];
                noteSpan.setAttribute('data-sentence-index', index);
                noteSpan.style.marginLeft = '0.5rem';
                noteSpan.style.cursor = 'pointer';
    
                // Add click event to make the note editable
                noteSpan.addEventListener('click', () => {
                    const textarea = document.createElement('textarea');
                    textarea.className = 'note-textarea';
                    textarea.value = p.notes[index];
                    textarea.style.width = '100%';
                    textarea.style.fontSize = '1rem';
                    textarea.style.marginTop = '0.5rem';
    
                    // Replace note span with textarea
                    noteSpan.replaceWith(textarea);
                    textarea.focus();
    
                    // Handle saving the edited note
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
    
            // Add a space between sentences
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

// ======= Accessibility Navigation Toggle =======
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') {
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

    if (e.key === 'Escape' && trapFocus) {
        nav.style.right = '-60vw';
        trapFocus = false;
        setFocusableInNav(false);
        document.activeElement.blur();
    }
});

// ======= Update Styling Settings =======
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
    if (key >= 1 && key <= 9) {
        highlightSentenceCount = key;
        readText(`Highlighting ${highlightSentenceCount} sentence${highlightSentenceCount > 1 ? 's' : ''}.`);
    }
});

// ======= Init on Load =======
setFocusableInNav(false);
if (paragraphs.length > 0) paragraphs[0].focus();
