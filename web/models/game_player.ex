defmodule Pokerboy.Player do
    defstruct id: nil, name: nil, vote: nil, is_player: false, original_vote: nil

    def sanitize_name(nil), do: nil
    def sanitize_name(name) do
        String.graphemes(name) 
        |> Enum.reject(&(byte_size(&1) > 1)) 
        |> Enum.join
        |> String.trim
        |> String.slice(0, 10)
    end
end