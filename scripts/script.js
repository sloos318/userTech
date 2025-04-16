// Setup
const synth = window.speechSynthesis;
const paragraphs = document.querySelectorAll('p');
let isPaused = false;
let currentSentenceIndex = 0;
let highlightSentenceCount = 1;
let currentFocusedParagraph = null;

// Helpers
function readText(text, callback) {
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = callback;
    synth.speak(utterance);
}

function splitIntoSentences(text) {
    return text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
}

function highlightSentences(paragraph, sentences, startIndex, count) {
    const highlightedText = sentences.map((sentence, index) => {
        if (index >= startIndex && index < startIndex + count) {
            return `<span class="highlight">${sentence}</span>`;
        }
        return sentence;
    }).join(' ');
    paragraph.innerHTML = highlightedText;
}

// Main logic
paragraphs.forEach(p => {
    const originalText = p.textContent;

    p.addEventListener('focus', () => {
        currentFocusedParagraph = p;
        const sentences = splitIntoSentences(originalText);
        currentSentenceIndex = 0;
        isPaused = false;

        function readNextSentence() {
            if (currentSentenceIndex < sentences.length && !isPaused) {
                highlightSentences(p, sentences, currentSentenceIndex, highlightSentenceCount);
                const toRead = sentences.slice(currentSentenceIndex, currentSentenceIndex + highlightSentenceCount).join(' ');
                readText(toRead, () => {
                    currentSentenceIndex += highlightSentenceCount;
                    if (currentSentenceIndex < sentences.length) readNextSentence();
                });
            }
        }

        readNextSentence();
    });

    p.addEventListener('blur', () => {
        setTimeout(() => {
            if (!p.querySelector('.note-textarea')) {
                p.innerHTML = originalText;
            }
        }, 100);
    });

    p.addEventListener('keydown', (e) => {
        const sentences = splitIntoSentences(originalText);

        // Pause/Play
        if (e.key === ' ') {
            e.preventDefault();
            if (synth.speaking) {
                synth.cancel();
                isPaused = true;
            } else {
                isPaused = false;
                highlightSentences(p, sentences, currentSentenceIndex, highlightSentenceCount);
                const toRead = sentences.slice(currentSentenceIndex, currentSentenceIndex + highlightSentenceCount).join(' ');
                readText(toRead, () => currentSentenceIndex += highlightSentenceCount);
            }
        }

        // Arrow Navigation
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentSentenceIndex > 0) {
                currentSentenceIndex -= highlightSentenceCount;
                highlightSentences(p, sentences, currentSentenceIndex, highlightSentenceCount);
                readText(sentences[currentSentenceIndex]);
            }
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentSentenceIndex < sentences.length - 1) {
                currentSentenceIndex += highlightSentenceCount;
                highlightSentences(p, sentences, currentSentenceIndex, highlightSentenceCount);
                readText(sentences[currentSentenceIndex]);
            }
        }

        // Add note with J
        if (e.key.toLowerCase() === 'j') {
            e.preventDefault();
            const highlightedSpan = p.querySelector('.highlight');
            if (highlightedSpan && !p.querySelector('.note-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'note-wrapper';
                wrapper.style.marginTop = '1rem';

                const textarea = document.createElement('textarea');
                textarea.className = 'note-textarea';
                textarea.setAttribute('placeholder', 'Write your note here...');
                textarea.style.width = '100%';
                textarea.style.fontSize = '1rem';

                const saveButton = document.createElement('button');
                saveButton.textContent = 'Save Note';
                saveButton.style.marginTop = '0.5rem';
                saveButton.style.display = 'block';

                saveButton.addEventListener('click', () => {
                    const noteText = textarea.value.trim();
                    if (noteText) {
                        const noteDate = new Date().toLocaleString();
                        const noteItem = document.createElement('div');
                        noteItem.className = 'note';
                        noteItem.innerHTML = `<strong>${noteDate}</strong><br>${noteText}`;
                        noteItem.style.marginTop = '0.5rem';
                        wrapper.replaceWith(noteItem);
                    }
                });

                wrapper.appendChild(textarea);
                wrapper.appendChild(saveButton);
                highlightedSpan.insertAdjacentElement('afterend', wrapper);
                textarea.focus();
            }
        }

        // Edit note with Enter
        if (e.key === 'Enter') {
            const note = p.querySelector('.note');
            if (note) {
                e.preventDefault();
                const existingText = note.innerText.split('\n').slice(1).join('\n');
                const wrapper = document.createElement('div');
                wrapper.className = 'note-wrapper';
                wrapper.style.marginTop = '1rem';

                const textarea = document.createElement('textarea');
                textarea.className = 'note-textarea';
                textarea.value = existingText;

                const saveButton = document.createElement('button');
                saveButton.textContent = 'Save Note';
                saveButton.style.marginTop = '0.5rem';

                saveButton.addEventListener('click', () => {
                    const noteText = textarea.value.trim();
                    if (noteText) {
                        const noteDate = new Date().toLocaleString();
                        const noteItem = document.createElement('div');
                        noteItem.className = 'note';
                        noteItem.innerHTML = `<strong>${noteDate}</strong><br>${noteText}`;
                        noteItem.style.marginTop = '0.5rem';
                        wrapper.replaceWith(noteItem);
                    }
                });

                wrapper.appendChild(textarea);
                wrapper.appendChild(saveButton);
                note.replaceWith(wrapper);
                textarea.focus();
            }
        }
    });
});

// Sentence count control
document.addEventListener('keydown', (e) => {
    const key = parseInt(e.key, 10);
    if (key >= 1 && key <= 9) {
        highlightSentenceCount = key;
        readText(`Highlighting ${highlightSentenceCount} sentence${highlightSentenceCount > 1 ? 's' : ''}.`);
    }
});
