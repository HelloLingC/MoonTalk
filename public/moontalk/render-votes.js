export function renderVoteState(refs, vote) {
    if (!refs.upvoteButton || !refs.downvoteButton) return;

    refs.upvoteCount.textContent = String(vote.upvotes);
    refs.downvoteCount.textContent = String(vote.downvotes);

    refs.upvoteButton.classList.toggle('active', vote.userVote === 1);
    refs.downvoteButton.classList.toggle('active', vote.userVote === -1);

    refs.upvoteButton.disabled = vote.loading;
    refs.downvoteButton.disabled = vote.loading;
}
