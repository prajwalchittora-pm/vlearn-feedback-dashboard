interface Props {
  rating: number;
  max?: number;
}

export function StarRating({ rating, max = 5 }: Props) {
  return (
    <span className="star-rating" title={`${rating} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i < rating;
        return (
          <span
            key={i}
            className={`star ${filled ? "filled" : half ? "half" : "empty"}`}
          >
            {filled ? "\u2605" : half ? "\u2605" : "\u2606"}
          </span>
        );
      })}
      <span className="star-number">{rating.toFixed(1)}</span>
    </span>
  );
}
