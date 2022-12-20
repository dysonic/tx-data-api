# This docker file is for creating a container to generate AWS compatible ZIP files
FROM ubuntu

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    zip
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs
RUN mkdir /working

# Copy function code
#COPY handle-ofx /working/.

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
#CMD [ "app.handler" ]
