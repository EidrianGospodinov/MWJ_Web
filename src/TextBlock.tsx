type Props = {
    value: string;
    onChange: (text: string) => void;
};

export default function TextBlock({
                                      value,
                                      onChange,
                                  }: Props) {
    return (
        <div>
      <textarea
          placeholder="Write text..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
      />
        </div>
    );
}