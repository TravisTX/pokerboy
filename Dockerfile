FROM elixir:1.6.1

# create app folder
RUN mkdir /app/
COPY . /app/
WORKDIR /app/

# install dependencies
RUN \
  mix local.hex --force && \
  mix local.rebar --force && \
  mix deps.get && \
  mix compile.phoenix

# run phoenix on port 4000
CMD mix phoenix.server

