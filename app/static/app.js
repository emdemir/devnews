/* Nothing fancy here, just a couple quality of life features. */

function activateReplyBoxes() {
    const handler = function() {
        // If the form is already shown, then hide it instead of adding a new
        // one.
        if (this.nextElementSibling.tagName === "FORM") {
            this.nextElementSibling.remove();
            return;
        }

        const commentForm = document.querySelector(".story-create-comment form");
        const newForm = commentForm.cloneNode(true);

        // Get abcdef from c_abcdef
        const parentID = this.parentElement.id.substring(2);
        const parentInput = document.createElement("input");
        parentInput.type = "hidden";
        parentInput.name = "parent";
        parentInput.value = parentID;

        newForm.appendChild(parentInput);
        this.parentElement.insertBefore(newForm, this.nextElementSibling);
    };

    Array.from(document.querySelectorAll(".comment-reply")).forEach(link => {
        link.addEventListener("click", handler, false);
    })
}

document.addEventListener("DOMContentLoaded", () => {
    // If we're on the story page, activate buttons for replying to comments.
    if (document.querySelector(".story-page")) {
        activateReplyBoxes();
    }
}, false);
