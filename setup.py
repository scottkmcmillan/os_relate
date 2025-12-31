from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="research-knowledge-manager",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A CLI tool for managing research with Claude-Flow and RuVector",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/research-knowledge-manager",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0.0",
        "requests>=2.25.0",
        # Add other dependencies as needed
    ],
    entry_points={
        'console_scripts': [
            'rkm=research_knowledge_manager.cli:cli',
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
